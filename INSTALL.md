# Installing Tcalm — تثبيت الإضافة

## English

You have **two** files. Pick the right one:

| File | What it is | Use it for |
| --- | --- | --- |
| `tcalm-v1.1.26.xpi` | The **built extension** (ready to run) | **Installing / trying the add-on** |
| `tcalm-v1.1.26-source.zip` | Source code for reviewers & developers | AMO review, modifying the code |

### Try it now (temporary, no signature needed)

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select **`tcalm-v1.1.26.xpi`** (you may also pick `manifest.json`
   inside the **extracted source archive** — since v1.0.1 its root is a
   complete, loadable copy of the extension).
4. The Tcalm icon appears in the toolbar. Click it — the popup shows
   today's prayer times.
5. Temporary add-ons are removed when Firefox closes. Re-load after a
   restart, or install permanently (below).

> **Do NOT load the source folder of the Git repository** (`tcalm-firefox/src/…`):
> it contains TypeScript sources, not the built JavaScript the manifest
> references. Loading it shows a blank popup and nothing runs.

### Install permanently

Firefox release builds only accept **signed** add-ons:

- Submit the XPI to [addons.mozilla.org](https://addons.mozilla.org/developers/)
  for a free signature (Mozilla account needed), or
- In **Firefox Developer Edition / Nightly**, set
  `about:config → xpinstall.signatures.required = false`, then install the
  XPI via `about:addons → ⚙ → Install Add-on From File…`.

## العربية

عندك **ملفان** — اختر الصحيح:

| الملف | ما هو | استخدامه |
| --- | --- | --- |
| `tcalm-v1.1.26.xpi` | **الإضافة الجاهزة** (مبنية وتعمل مباشرة) | **التجربة والتثبيت** |
| `tcalm-v1.1.26-source.zip` | الكود المصدري للمطورين ومراجعي موزيلا | التعديل والتطوير |

### جرّبها الآن (تثبيت مؤقت — لا يحتاج توقيعاً)

1. افتح فايرفوكس واذهب إلى `about:debugging#/runtime/this-firefox`.
2. اضغط زر **Load Temporary Add-on…**.
3. اختر ملف **`tcalm-v1.1.26.xpi`**
   (يمكن أيضاً اختيار `manifest.json` من داخل **حزمة المصدر بعد فكّها** —
   ابتداءً من الإصدار 1.0.1 صار جذر الحزمة نسخة كاملة قابلة للتحميل).
4. سيظهر أيقونة Tcalm في شريط الأدوات. اضغطها — يعرض البوباب مواقيت
   الصلاة لليوم.
5. الإضافة المؤقتة تُحذف عند إغلاق فايرفوكس؛ أعد تحميلها بعد التشغيل
   التالي، أو ثبّتها نهائياً (بالأسفل).

> **لا تُحمِّل مجلد المصدر** (`tcalm-firefox/src/…`): يحتوي على TypeScript
> وليس الجافاسكريبت المبني الذي يشير إليه `manifest.json` — تحميله يعرض
> بوباباً أبيض فارغاً ولا يعمل شيء.

### التثبيت الدائم

نسخة فايرفوكس الرسمية تقبل الإضافات **الموقَّعة** فقط:

- ارفع ملف XPI على [addons.mozilla.org](https://addons.mozilla.org/developers/)
  للحصول على توقيع مجاني (يلزم حساب Mozilla)، أو
- في **Firefox Developer Edition / Nightly**: اضبط
  `about:config → xpinstall.signatures.required = false`، ثم ثبّت ملف XPI
  من `about:addons → ⚙ → Install Add-on From File…`.

---

If the popup ever shows a yellow warning box, follow the instructions inside
it — it means the extension code did not start (e.g. the source folder was
loaded instead of the built XPI).
