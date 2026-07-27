# Firebase App Distribution: как давать заказчику ссылку вместо APK

Firebase App Distribution позволяет загружать APK в Firebase и давать заказчику ссылку на установку. После этого не нужно каждый раз отправлять APK-файл вручную.

Документация Firebase:

```text
https://firebase.google.com/docs/app-distribution/android/distribute-cli
```

## Данные этого проекта

Firebase project id:

```text
school-f628b
```

Android package:

```text
com.studymotivator.app
```

Firebase Android App ID:

```text
1:205397389043:android:2368362f2a58c286149186
```

Основной APK для отправки тестерам:

```text
D:\work\vitaliy\study-motivator-apk\android\app\build\outputs\apk\release\app-release.apk
```

## 1. Один раз включить App Distribution в Firebase Console

1. Откройте Firebase Console:

```text
https://console.firebase.google.com/project/school-f628b/appdistribution
```

2. Выберите Android-приложение `com.studymotivator.app`.
3. Если Firebase попросит, нажмите `Get started`.
4. Добавьте заказчика как тестера:
   - раздел `Testers & Groups`;
   - `Add testers`;
   - введите email заказчика.

Заказчику придёт приглашение. Ему нужно принять приглашение с того email, который вы добавили.

## 2. Перед сборкой выставить правильную Java

На этом компьютере по умолчанию стоит Java 8, а Android-сборке нужна Java 11+.

Перед сборкой всегда выполните:

```powershell
cd D:\work\vitaliy\study-motivator-apk

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

java -version
```

В выводе должно быть `openjdk version "17..."` или `openjdk version "21..."`.

## 3. Проверить код перед сборкой

```powershell
cd D:\work\vitaliy\study-motivator-apk
npx.cmd tsc --noEmit
```

Если команда завершилась без ошибок, можно собирать APK.

## 4. Собрать release APK

```powershell
cd D:\work\vitaliy\study-motivator-apk\android

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

.\gradlew.bat assembleRelease
```

После успешной сборки APK будет здесь:

```text
D:\work\vitaliy\study-motivator-apk\android\app\build\outputs\apk\release\app-release.apk
```

Важно: сейчас release-сборка в `android/app/build.gradle` подписывается debug-ключом. Для тестирования через Firebase App Distribution это подходит. Для публикации в Google Play позже нужен нормальный production keystore.

## 5. Загрузить APK в Firebase App Distribution

Команда для загрузки APK и отправки заказчику:

```powershell
cd D:\work\vitaliy\study-motivator-apk

npx.cmd firebase-tools appdistribution:distribute "D:\work\vitaliy\study-motivator-apk\android\app\build\outputs\apk\release\app-release.apk" `
  --project school-f628b `
  --app "1:205397389043:android:2368362f2a58c286149186" `
  --testers "customer@example.com" `
  --release-notes "Новая тестовая версия Study Motivator."
```

Замените:

```text
customer@example.com
```

на email заказчика.

Если заказчиков несколько:

```powershell
--testers "first@example.com,second@example.com,third@example.com"
```

## 6. Удобный вариант: testers.txt

Можно создать файл:

```text
D:\work\vitaliy\study-motivator-apk\testers.txt
```

Пример содержимого:

```text
customer@example.com
manager@example.com
```

Тогда команда будет такой:

```powershell
cd D:\work\vitaliy\study-motivator-apk

npx.cmd firebase-tools appdistribution:distribute "D:\work\vitaliy\study-motivator-apk\android\app\build\outputs\apk\release\app-release.apk" `
  --project school-f628b `
  --app "1:205397389043:android:2368362f2a58c286149186" `
  --testers-file "D:\work\vitaliy\study-motivator-apk\testers.txt" `
  --release-notes "Новая тестовая версия Study Motivator."
```

## 7. Удобный вариант: release-notes.txt

Можно создать файл:

```text
D:\work\vitaliy\study-motivator-apk\release-notes.txt
```

Пример:

```text
Что изменилось:
- после создания ребёнка открывается создание кабинета;
- добавлены категории A/B/C для предметов;
- исправлено начисление дробных баллов;
- обновлены Firestore rules.
```

Тогда команда:

```powershell
cd D:\work\vitaliy\study-motivator-apk

npx.cmd firebase-tools appdistribution:distribute "D:\work\vitaliy\study-motivator-apk\android\app\build\outputs\apk\release\app-release.apk" `
  --project school-f628b `
  --app "1:205397389043:android:2368362f2a58c286149186" `
  --testers-file "D:\work\vitaliy\study-motivator-apk\testers.txt" `
  --release-notes-file "D:\work\vitaliy\study-motivator-apk\release-notes.txt"
```

## 8. Что увидит заказчик

После загрузки Firebase отправит тестеру email-приглашение или уведомление о новой версии.

Заказчик открывает ссылку, устанавливает приложение и дальше сможет получать новые версии через Firebase App Distribution.

Если нужно вручную скопировать ссылку:

1. Откройте Firebase Console:

```text
https://console.firebase.google.com/project/school-f628b/appdistribution
```

2. Откройте нужный release.
3. Скопируйте release link.
4. Отправьте заказчику.

Важно: ссылка работает для тестеров, которым вы дали доступ. Если заказчик не добавлен в testers/groups, он может не скачать приложение.

## 9. Полный сценарий каждый раз перед отправкой заказчику

```powershell
cd D:\work\vitaliy\study-motivator-apk

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

npx.cmd tsc --noEmit

cd D:\work\vitaliy\study-motivator-apk\android
.\gradlew.bat assembleRelease

cd D:\work\vitaliy\study-motivator-apk
npx.cmd firebase-tools appdistribution:distribute "D:\work\vitaliy\study-motivator-apk\android\app\build\outputs\apk\release\app-release.apk" `
  --project school-f628b `
  --app "1:205397389043:android:2368362f2a58c286149186" `
  --testers-file "D:\work\vitaliy\study-motivator-apk\testers.txt" `
  --release-notes-file "D:\work\vitaliy\study-motivator-apk\release-notes.txt"
```

## 10. Частые проблемы

### `firebase` не найден

Используйте:

```powershell
npx.cmd firebase-tools --version
```

И запускайте команды через:

```powershell
npx.cmd firebase-tools ...
```

### Firebase просит логин

Выполните:

```powershell
npx.cmd firebase-tools login
```

Откроется браузер. Войдите в Google-аккаунт, у которого есть доступ к проекту `school-f628b`.

### Ошибка доступа к проекту

Проверьте, что вы залогинены правильным аккаунтом:

```powershell
npx.cmd firebase-tools login:list
```

### Заказчик не может скачать APK

Проверьте:

- email заказчика добавлен в Firebase App Distribution;
- заказчик принял приглашение;
- ссылка относится к Android-приложению `com.studymotivator.app`;
- заказчик открывает ссылку с того email/Google-аккаунта, который добавлен в testers.

