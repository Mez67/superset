# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
"""
Microsoft Active Directory support for LDAP authentication.

Flask-AppBuilder's LDAP flow works against Active Directory, but a few AD
specifics need handling to make group-based access reliable. With
``AUTH_TYPE = AUTH_LDAP`` and ``AUTH_LDAP_ACTIVE_DIRECTORY = True``:

* Usernames are normalized, so ``CORP\\ali``, ``ali@corp.example`` and
  ``Ali`` all sign in as ``ali`` instead of creating separate users.
* Nested group membership is resolved with AD's
  ``LDAP_MATCHING_RULE_IN_CHAIN``; ``memberOf`` alone lists direct groups.
* ``AUTH_ROLES_MAPPING`` keys may be a group's full DN or its short name
  (``CN``), matched case-insensitively.
* With ``AUTH_GROUPS_SYNC_AT_LOGIN``, Superset groups are named after the AD
  group's short name rather than its DN.
"""

from __future__ import annotations

import logging
from typing import Any, TYPE_CHECKING

from flask import current_app
from flask_appbuilder.const import AUTH_LDAP

if TYPE_CHECKING:
    from flask_appbuilder.security.sqla.manager import SecurityManager as _Base
else:
    _Base = object

logger = logging.getLogger(__name__)

# OID of LDAP_MATCHING_RULE_IN_CHAIN, which makes a ``member`` filter follow
# nested group membership transitively.
LDAP_MATCHING_RULE_IN_CHAIN = "1.2.840.113556.1.4.1941"


def normalize_ad_username(username: str, uid_field: str = "sAMAccountName") -> str:
    """Canonical form of an AD login name.

    The ``DOMAIN\\`` prefix is always dropped. The ``@domain`` suffix is
    dropped when users are looked up by ``sAMAccountName``, and kept when
    they are looked up by ``userPrincipalName``, where it is part of the
    value. AD compares both case-insensitively, so the result is lowercase.
    """
    name = username.strip()
    if "\\" in name:
        name = name.split("\\", 1)[1]
    if "@" in name and uid_field.lower() == "samaccountname":
        name = name.split("@", 1)[0]
    return name.lower()


def _rdns(dn: str) -> list[tuple[str, str]]:
    """``(attribute, value)`` pairs of a DN, first RDN component only."""
    try:
        from ldap.dn import str2dn

        return [(rdn[0][0], rdn[0][1]) for rdn in str2dn(dn)]
    except Exception:  # pylint: disable=broad-except
        return [
            (part.split("=", 1)[0].strip(), part.split("=", 1)[1].strip())
            for part in dn.split(",")
            if "=" in part
        ]


def normalize_dn(dn: str) -> str:
    """Case- and whitespace-insensitive form of a DN, for comparison."""
    rdns = _rdns(dn)
    if not rdns:
        return dn.strip().lower()
    return ",".join(f"{attr.lower()}={value.lower()}" for attr, value in rdns)


def group_short_name(dn: str) -> str | None:
    """The ``CN`` of a group DN, e.g. ``BI-Admins`` for ``CN=BI-Admins,...``."""
    rdns = _rdns(dn)
    if rdns and rdns[0][0].lower() == "cn":
        return rdns[0][1]
    return None


def domain_root(dn: str) -> str:
    """The ``DC=...`` suffix of a DN, i.e. the root of its domain."""
    return ",".join(
        f"{attr}={value}" for attr, value in _rdns(dn) if attr.lower() == "dc"
    )


def match_mapping_keys(group_dns: list[str], mapping_keys: list[str]) -> list[str]:
    """Keys of ``AUTH_ROLES_MAPPING`` that match any of the user's groups.

    A key matches a group when it equals the group's DN or its short name,
    ignoring case and the spacing around DN separators.
    """
    identities: set[str] = set()
    for dn in group_dns:
        identities.add(normalize_dn(dn))
        if short_name := group_short_name(dn):
            identities.add(short_name.lower())
    return [
        key
        for key in mapping_keys
        if (normalize_dn(key) if "=" in key else key.strip().lower()) in identities
    ]


class ActiveDirectoryMixin(_Base):
    """Active Directory behaviour for Flask-AppBuilder's LDAP authentication."""

    @property
    def auth_ldap_active_directory(self) -> bool:
        return bool(
            current_app.config.get("AUTH_LDAP_ACTIVE_DIRECTORY")
            and current_app.config.get("AUTH_TYPE") == AUTH_LDAP
        )

    def auth_user_ldap(self, username: str, password: str) -> Any:
        if self.auth_ldap_active_directory and username:
            username = normalize_ad_username(username, self.auth_ldap_uid_field)
        return super().auth_user_ldap(username, password)

    def _search_ldap(self, ldap: Any, con: Any, username: str) -> Any:
        user_dn, user_info = super()._search_ldap(ldap, con, username)
        if (
            self.auth_ldap_active_directory
            and user_dn
            and current_app.config.get("AUTH_LDAP_AD_NESTED_GROUPS", True)
            and (self.auth_roles_mapping or self.auth_groups_sync_at_login)
        ):
            field = self.auth_ldap_group_field
            known = list(user_info.get(field, []))
            seen = {value.decode("utf-8").lower() for value in known}
            for dn in self._ad_nested_group_dns(ldap, con, user_dn):
                if dn.lower() not in seen:
                    known.append(dn.encode("utf-8"))
                    seen.add(dn.lower())
            user_info[field] = known
        return user_dn, user_info

    def _ad_nested_group_dns(self, ldap: Any, con: Any, user_dn: str) -> list[str]:
        """DNs of every group the user belongs to, directly or through nesting."""
        from ldap.filter import escape_filter_chars

        base = current_app.config.get("AUTH_LDAP_AD_GROUP_SEARCH") or domain_root(
            user_dn
        )
        filter_str = (
            f"(&(objectClass=group)"
            f"(member:{LDAP_MATCHING_RULE_IN_CHAIN}:={escape_filter_chars(user_dn)}))"
        )
        try:
            results = con.search_s(base, ldap.SCOPE_SUBTREE, filter_str, ["cn"])
        except ldap.LDAPError:
            logger.warning(
                "Could not resolve nested AD groups for '%s'", user_dn, exc_info=True
            )
            return []
        return [dn for dn, attrs in results if dn and isinstance(attrs, dict)]

    def _ldap_calculate_user_roles(self, user_attributes: dict[str, Any]) -> Any:
        if not self.auth_ldap_active_directory:
            return super()._ldap_calculate_user_roles(user_attributes)
        group_dns = self.ldap_extract_list(user_attributes, self.auth_ldap_group_field)
        matched = match_mapping_keys(group_dns, list(self.auth_roles_mapping))
        translated = {
            **user_attributes,
            self.auth_ldap_group_field: [key.encode("utf-8") for key in matched],
        }
        return super()._ldap_calculate_user_roles(translated)

    def _ldap_calculate_user_groups(self, user_attributes: dict[str, Any]) -> Any:
        if not self.auth_ldap_active_directory:
            return super()._ldap_calculate_user_groups(user_attributes)
        group_dns = self.ldap_extract_list(user_attributes, self.auth_ldap_group_field)
        names = [name for dn in group_dns if (name := group_short_name(dn))]
        translated = {
            **user_attributes,
            self.auth_ldap_group_field: [name.encode("utf-8") for name in names],
        }
        return super()._ldap_calculate_user_groups(translated)
