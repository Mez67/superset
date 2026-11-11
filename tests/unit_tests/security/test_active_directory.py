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
"""Tests for Active Directory support in LDAP authentication."""

from typing import Any
from unittest.mock import MagicMock, patch

import ldap
import pytest
from flask_appbuilder.const import AUTH_DB, AUTH_LDAP

from superset.security.active_directory import (
    domain_root,
    group_short_name,
    LDAP_MATCHING_RULE_IN_CHAIN,
    match_mapping_keys,
    normalize_ad_username,
    normalize_dn,
)

USER_DN = "CN=علی رضایی,OU=BI,DC=corp,DC=test"
SALES = "CN=Sales-Tehran,OU=BI,DC=corp,DC=test"
ANALYSTS = "CN=BI-Analysts,OU=BI,DC=corp,DC=test"


@pytest.mark.parametrize(
    "username,uid_field,expected",
    [
        ("CORP\\Ali", "sAMAccountName", "ali"),
        ("ali@corp.test", "sAMAccountName", "ali"),
        ("  ALI ", "sAMAccountName", "ali"),
        ("Ali@Corp.Test", "userPrincipalName", "ali@corp.test"),
        ("CORP\\ali@corp.test", "userPrincipalName", "ali@corp.test"),
    ],
)
def test_normalize_ad_username(username: str, uid_field: str, expected: str) -> None:
    assert normalize_ad_username(username, uid_field) == expected


def test_dn_helpers() -> None:
    assert normalize_dn("CN=BI-Admins, OU=BI ,DC=Corp,DC=Test") == normalize_dn(
        "cn=bi-admins,ou=bi,dc=corp,dc=test"
    )
    assert group_short_name(ANALYSTS) == "BI-Analysts"
    assert group_short_name("OU=BI,DC=corp,DC=test") is None
    assert domain_root(USER_DN) == "DC=corp,DC=test"


def test_match_mapping_keys() -> None:
    keys = [
        "BI-Analysts",
        "cn=sales-tehran, ou=bi, dc=corp, dc=test",
        "BI-Admins",
        "CN=Other,OU=BI,DC=corp,DC=test",
    ]
    assert match_mapping_keys([SALES, ANALYSTS], keys) == keys[:2]
    assert match_mapping_keys([], keys) == []


@pytest.fixture
def ad_config(app_context: None) -> Any:
    from flask import current_app

    overrides = {
        "AUTH_TYPE": AUTH_LDAP,
        "AUTH_LDAP_ACTIVE_DIRECTORY": True,
        "AUTH_LDAP_AD_NESTED_GROUPS": True,
        "AUTH_LDAP_AD_GROUP_SEARCH": "",
        "AUTH_LDAP_UID_FIELD": "sAMAccountName",
        "AUTH_LDAP_GROUP_FIELD": "memberOf",
        "AUTH_ROLES_MAPPING": {"BI-Analysts": ["Alpha"]},
        "AUTH_GROUPS_SYNC_AT_LOGIN": False,
    }
    with patch.dict(current_app.config, overrides):
        yield current_app.config


def test_auth_user_ldap_normalizes_username(ad_config: Any) -> None:
    from flask_appbuilder.security.sqla.manager import SecurityManager

    from superset.extensions import security_manager

    with patch.object(SecurityManager, "auth_user_ldap", return_value="user") as base:
        assert security_manager.auth_user_ldap("CORP\\Ali", "secret") == "user"
    base.assert_called_once_with("ali", "secret")


def test_auth_user_ldap_untouched_when_disabled(ad_config: Any) -> None:
    from flask_appbuilder.security.sqla.manager import SecurityManager

    from superset.extensions import security_manager

    ad_config["AUTH_LDAP_ACTIVE_DIRECTORY"] = False
    with patch.object(SecurityManager, "auth_user_ldap", return_value=None) as base:
        security_manager.auth_user_ldap("CORP\\Ali", "secret")
    base.assert_called_once_with("CORP\\Ali", "secret")


def test_auth_user_ldap_untouched_for_other_auth_types(ad_config: Any) -> None:
    from flask_appbuilder.security.sqla.manager import SecurityManager

    from superset.extensions import security_manager

    ad_config["AUTH_TYPE"] = AUTH_DB
    with patch.object(SecurityManager, "auth_user_ldap", return_value=None) as base:
        security_manager.auth_user_ldap("CORP\\Ali", "secret")
    base.assert_called_once_with("CORP\\Ali", "secret")


def test_search_ldap_adds_nested_groups(ad_config: Any) -> None:
    from flask_appbuilder.security.sqla.manager import SecurityManager

    from superset.extensions import security_manager

    con = MagicMock()
    con.search_s.return_value = [
        (SALES, {"cn": [b"Sales-Tehran"]}),
        (ANALYSTS, {"cn": [b"BI-Analysts"]}),
        (None, ["ldap://referral"]),
    ]
    direct = (USER_DN, {"memberOf": [SALES.encode()]})
    with patch.object(SecurityManager, "_search_ldap", return_value=direct):
        user_dn, info = security_manager._search_ldap(ldap, con, "ali")

    assert user_dn == USER_DN
    assert info["memberOf"] == [SALES.encode(), ANALYSTS.encode()]
    base, scope, filter_str, attrs = con.search_s.call_args.args
    assert base == "DC=corp,DC=test"
    assert scope == ldap.SCOPE_SUBTREE
    assert f"member:{LDAP_MATCHING_RULE_IN_CHAIN}:=" in filter_str
    assert "objectClass=group" in filter_str


def test_search_ldap_uses_configured_group_base(ad_config: Any) -> None:
    from flask_appbuilder.security.sqla.manager import SecurityManager

    from superset.extensions import security_manager

    ad_config["AUTH_LDAP_AD_GROUP_SEARCH"] = "OU=Groups,DC=corp,DC=test"
    con = MagicMock()
    con.search_s.return_value = []
    with patch.object(
        SecurityManager, "_search_ldap", return_value=(USER_DN, {"memberOf": []})
    ):
        security_manager._search_ldap(ldap, con, "ali")
    assert con.search_s.call_args.args[0] == "OU=Groups,DC=corp,DC=test"


def test_search_ldap_survives_group_lookup_errors(ad_config: Any) -> None:
    from flask_appbuilder.security.sqla.manager import SecurityManager

    from superset.extensions import security_manager

    con = MagicMock()
    con.search_s.side_effect = ldap.OPERATIONS_ERROR({"desc": "denied"})
    direct = (USER_DN, {"memberOf": [SALES.encode()]})
    with patch.object(SecurityManager, "_search_ldap", return_value=direct):
        _, info = security_manager._search_ldap(ldap, con, "ali")
    assert info["memberOf"] == [SALES.encode()]


def test_search_ldap_skips_nested_lookup_when_disabled(ad_config: Any) -> None:
    from flask_appbuilder.security.sqla.manager import SecurityManager

    from superset.extensions import security_manager

    ad_config["AUTH_LDAP_AD_NESTED_GROUPS"] = False
    con = MagicMock()
    with patch.object(
        SecurityManager, "_search_ldap", return_value=(USER_DN, {"memberOf": []})
    ):
        security_manager._search_ldap(ldap, con, "ali")
    con.search_s.assert_not_called()


def test_roles_are_mapped_by_short_name(ad_config: Any) -> None:
    from flask_appbuilder.security.sqla.manager import SecurityManager

    from superset.extensions import security_manager

    with patch.object(
        SecurityManager, "_ldap_calculate_user_roles", return_value=["roles"]
    ) as base:
        security_manager._ldap_calculate_user_roles(
            {"memberOf": [SALES.encode(), ANALYSTS.encode()]}
        )
    assert base.call_args.args[0]["memberOf"] == [b"BI-Analysts"]


def test_groups_are_synced_by_short_name(ad_config: Any) -> None:
    from flask_appbuilder.security.sqla.manager import SecurityManager

    from superset.extensions import security_manager

    with patch.object(
        SecurityManager, "_ldap_calculate_user_groups", return_value=[]
    ) as base:
        security_manager._ldap_calculate_user_groups(
            {"memberOf": [SALES.encode(), ANALYSTS.encode()]}
        )
    assert base.call_args.args[0]["memberOf"] == [b"Sales-Tehran", b"BI-Analysts"]
