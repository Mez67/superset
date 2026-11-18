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
"""Site settings for the offline deployment, loaded after superset_config.py.

Edit this file on the server; restart with `docker compose restart` to apply.
Secrets belong in .env, not here.
"""

import os

# Persian interface, right to left, Jalali calendar
BABEL_DEFAULT_LOCALE = "fa"
LANGUAGES = {
    "fa": {"flag": "ir", "name": "فارسی"},
    "en": {"flag": "us", "name": "English"},
}
CALENDAR = "jalali"

# The address users open, used in e-mailed report links
WEBDRIVER_BASEURL_USER_FRIENDLY = os.environ.get(
    "SUPERSET_PUBLIC_URL", "http://localhost:8088/"
)

# No calls to the internet from an offline network
SCARF_ANALYTICS = False

FEATURE_FLAGS = {
    "ALERT_REPORTS": True,
    "DATASET_FOLDERS": True,
    "ENABLE_EXTENSIONS": True,
    "MOBILE_CONSUMPTION_MODE": True,
    # Needed for row level security rules that use the user's AD groups
    "ENABLE_TEMPLATE_PROCESSING": True,
    # Embedding dashboards in your own app
    # "EMBEDDED_SUPERSET": True,
}

# --- Active Directory (uncomment and fill in) -------------------------------
# from flask_appbuilder.security.manager import AUTH_LDAP
# AUTH_TYPE = AUTH_LDAP
# AUTH_LDAP_SERVER = "ldaps://dc01.corp.example:636"
# AUTH_LDAP_TLS_CACERTFILE = "/app/docker/pythonpath_dev/corp-ca.pem"
# AUTH_LDAP_BIND_USER = "svc-superset@corp.example"
# AUTH_LDAP_BIND_PASSWORD = os.environ["AD_BIND_PASSWORD"]  # set in .env
# AUTH_LDAP_SEARCH = "OU=Staff,DC=corp,DC=example"
# AUTH_LDAP_UID_FIELD = "sAMAccountName"
# AUTH_LDAP_ACTIVE_DIRECTORY = True
# AUTH_USER_REGISTRATION = True
# AUTH_USER_REGISTRATION_ROLE = "Public"
# AUTH_ROLES_SYNC_AT_LOGIN = True
# AUTH_ROLES_MAPPING = {"BI-Admins": ["Admin"], "BI-Analysts": ["Alpha"]}
# AUTH_GROUPS_SYNC_AT_LOGIN = True
# AUTH_AUTO_CREATE_GROUPS = True

# --- Embedding in your React app ---------------------------------------------
# GUEST_ROLE_NAME = "EmbeddedViewer"
# GUEST_TOKEN_JWT_SECRET = os.environ["GUEST_TOKEN_JWT_SECRET"]  # set in .env
# EMBEDDED_FRAME_ANCESTORS = ["https://app.corp.example"]
