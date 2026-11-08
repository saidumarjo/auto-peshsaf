# AUTO PESHSAF — чӣ тавр баъдтар таҳрир кардан

## Ҳамааш дар куҷо нигоҳ дошта мешавад
| Чӣ | Куҷо |
|---|---|
| Коди сайт (манбаъ) | `src/fb.js` (мантиқ), `src/style.css` (дизайн) |
| Сайти тайёр | `index.html` — аз `src/` бо `python3 build.py` сохта мешавад |
| Қоидаҳои Firebase | `firestore.rules` (ба Firebase → Firestore → Rules гузошта мешавад) |
| Барномаи Android (APK) | `android/` ва `.github/workflows/apk.yml` |
| Маълумот (дархостҳо, нархҳо, муштариён) | Firebase, лоиҳаи сайти AUTO PESHSAF (на дар GitHub) |
| Нусхаи эҳтиётии маълумот | Сайт → ⚙ Танзимот → «Нусхаи эҳтиётӣ гирифтан» (файли JSON) |

## Барои таҳрир бо Claude (пас аз чанд моҳ)
1. Дар claude.ai чати нав кушоед ва GitHub-ро пайваст кунед.
2. Нависед: «Репозиторияи **saidumarjo/auto-peshsaf**-ро кушо ва аз `DEVELOPING.md` сар кун. Ман мехоҳам …».
3. Claude `src/fb.js` ва `src/style.css`-ро таҳрир мекунад, `cd src && python3 build.py` мекунад, `node test.js` месанҷад ва ба GitHub мефиристад.
4. Агар қоидаҳо иваз шаванд — `firestore.rules`-ро дар Firebase Publish кунед.

## Сохтан ва санҷидан
```
cd src
python3 build.py      # index.html-ро дар решаи репо месозад
node test.js          # санҷиши тез (бояд "OK" нависад)
```

## Сохтор (кӯтоҳ)
- Нақшҳо: роҳбар (Google, admins/{email}), коргар (логин/парол → `staff/{uid}`), муштарӣ (ном + WhatsApp → `sessions/{uid}`).
- Коллексияҳо: `settings/app`, `workers`, `staff`, `sessions`, `customers`, `requests` (умумӣ), `priv` (нархи харид, паставшикҳо, музд), `photos`, `admins`, `activity`, `presence`.
- Раванд: Дархост → Масъул → Нархи паставшик (+VAT) → Нарх ба муштарӣ → Тасдиқ → Масъули заказ → Харид/Баста/Карго (акс, вазн, сана) → Ба муштарӣ фиристодан → Пардохт → Музди коргар → Фоида/Инвойс.
