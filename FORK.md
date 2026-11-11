<!--
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
-->

# نگهداری این نسخه و دریافت به‌روزرسانی‌های Superset

این مخزن یک fork از [apache/superset](https://github.com/apache/superset) است با این تغییرات:
فارسی و راست‌به‌چپ، تقویم شمسی، Active Directory، بهبودهای جاسازی (embedding) و پوسته برند.
این راهنما توضیح می‌دهد چطور نسخه‌های تازه Superset را بگیرید و کمترین تداخل (conflict) را داشته باشید.

## قواعدی که تداخل را کم نگه می‌دارد

1. **تغییر تازه را در فایل تازه بنویسید.** Git فقط وقتی تداخل می‌دهد که هر دو طرف یک خط را عوض کرده باشند.
   پوسته برند به همین دلیل در فایل‌های جدا است:
   - `superset/brand_theme.py`: رنگ‌ها، گردی گوشه‌ها، سایه‌ها، توکن‌های اجزا و پالت پیش‌فرض نمودارها
   - `superset-frontend/packages/superset-core/src/theme/BrandGlobalStyles.tsx`: ظاهر نوار بالا، فهرست‌ها، صفحه ورود و صفحه خانه

   در فایل‌های اصلی Superset فقط چند خط اتصال اضافه شده است.
2. **تنظیمات محیط شما در `superset_config.py` بماند**، نه در `superset/config.py`.
   در Docker این فایل `docker/pythonpath_dev/superset_config_docker.py` است که در git نیست و هیچ‌وقت تداخل نمی‌دهد.
   AD، تقویم، زبان، کلیدها و آدرس برنامه‌ای که داشبورد را جاسازی می‌کند همه آنجا قرار می‌گیرند.
3. **رنگ و لوگو را بدون تغییر کد عوض کنید:** با `THEME_DEFAULT` در `superset_config.py`، یا از منوی
   Settings > Themes در خود Superset.
4. **تغییرات عمومی را به Superset اصلی بفرستید.** اصلاح ترجمه‌ها، RTL، تقویم شمسی و AD برای همه کاربران مفیدند.
   هر تغییری که در Superset اصلی پذیرفته شود از اختلاف این fork حذف می‌شود و دیگر تداخلی نمی‌دهد.

## راه‌اندازی یک‌باره

```bash
git remote add upstream https://github.com/apache/superset.git
git config rerere.enabled true
```

`rerere` راه‌حل هر تداخل را به خاطر می‌سپارد و اگر همان تداخل دوباره پیش بیاید خودش اعمالش می‌کند.

## گرفتن یک نسخه تازه

نسخه‌های منتشرشده (tag مثل `6.1.0`) را دنبال کنید، نه شاخه `master` که ناپایدار است.

```bash
git fetch upstream --tags
git checkout -b sync/6.1.0 main   # main: شاخه اصلی شما
git merge 6.1.0
```

از `merge` استفاده کنید، نه `rebase`. این شاخه قبلاً push شده و rebase تاریخچه را بازنویسی می‌کند.

اگر تداخل پیش آمد:

- **فایل ترجمه** (`superset/translations/fa/LC_MESSAGES/messages.po`): نسخه خودمان را نگه دارید،
  بعد عبارت‌های تازه Superset را با اسکریپت خود پروژه به آن اضافه کنید:

  ```bash
  git checkout --ours superset/translations/fa/LC_MESSAGES/messages.po
  ./scripts/translations/babel_update.sh
  msgattrib --untranslated superset/translations/fa/LC_MESSAGES/messages.po | grep -c '^msgid'
  ```

  عدد آخر تعداد عبارت‌های تازه‌ای است که هنوز ترجمه نشده‌اند. آن‌ها را ترجمه کنید.
- **فایل‌های کد:** هر دو تغییر را نگه دارید. تغییرات ما معمولاً کوچک‌اند: پیچیدن متن در `t()`،
  استفاده از `formatDisplayDate` برای تاریخ‌ها، یا ویژگی‌های CSS منطقی (`inset-inline-start` و مانند آن).
- **`package-lock.json`:** نسخه Superset را بردارید و `npm install` را دوباره اجرا کنید.

## بررسی پیش از ادغام

```bash
pytest tests/unit_tests/brand_theme_test.py tests/unit_tests/utils/date_parser_tests.py tests/unit_tests/views/test_base.py tests/unit_tests/config_test.py
cd superset-frontend && npm run test -- src/setup packages/superset-core/src/theme packages/superset-ui-core/src/time-format
```

بعد Docker را دوباره بسازید و صفحه‌ها را مرور کنید: ورود، داشبورد، نمودار، SQL Lab، فیلتر تاریخ و ورود با AD.

```bash
docker compose -f docker-compose-non-dev.yml up --build
```

در ویندوز، پیش از این دستور `BUILD_TRANSLATIONS` را تنظیم کنید
(در PowerShell: `$env:BUILD_TRANSLATIONS="true"`).

اگر همه‌چیز درست بود، شاخه `sync/...` را در شاخه اصلی خود ادغام و push کنید.

## فهرست تغییرات این fork

`git diff <tag> --stat` همه فایل‌هایی را که نسبت به آن نسخه تغییر کرده‌اند نشان می‌دهد.
بخش عمده تغییرات در فایل‌های جدا قرار دارد. در فایل‌های اصلی Superset بیشتر تغییرات یک یا دو خطی‌اند.
