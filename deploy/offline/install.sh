#!/usr/bin/env bash
#
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# Installs or updates the offline bundle on a server without internet access.
# Run from the bundle folder:  sudo ./install.sh
set -euo pipefail
cd "$(dirname "$0")"

say() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null || fail "Docker is not installed."
docker compose version >/dev/null 2>&1 || fail "The Docker Compose plugin is not installed."

say "Checking file integrity (SHA256SUMS.txt)"
sha256sum --quiet -c SHA256SUMS.txt || fail "Files differ from the ones the bundle was built with. Copy the bundle again."

say "Loading images (a few minutes)"
docker load -i images.tar

say "Checking image IDs"
while read -r image expected; do
  actual="$(docker image inspect --format '{{.Id}}' "$image")"
  [ "$actual" = "$expected" ] || fail "$image has ID $actual, expected $expected"
  echo "ok  $image"
done < IMAGE_IDS.txt

if [ ! -f .env ]; then
  cp env.example .env
  chmod 600 .env
  fail "Created .env: set every CHANGE_ME in it, then run ./install.sh again."
fi
grep -q '^[^#]*CHANGE_ME' .env && fail ".env still contains CHANGE_ME values."
grep -q '^SUPERSET_IMAGE=' .env || fail ".env has no SUPERSET_IMAGE line."
# Keep the image of this bundle, even when .env came from an older one.
sed -i "s|^SUPERSET_IMAGE=.*|$(grep '^SUPERSET_IMAGE=' env.example)|" .env

say "Starting (database migrations run first)"
docker compose up -d

port="$(grep -E '^SUPERSET_HOST_PORT=' .env | cut -d= -f2)"
port="${port:-8088}"
say "Waiting for http://localhost:${port}/health"
for _ in $(seq 1 90); do
  if curl -fsS "http://localhost:${port}/health" >/dev/null 2>&1; then
    say "Ready: http://$(hostname -I 2>/dev/null | awk '{print $1}'):${port}  (user: admin)"
    exit 0
  fi
  sleep 5
done
docker compose ps
fail "Superset did not answer within 7.5 minutes; see: docker compose logs superset-init superset"
