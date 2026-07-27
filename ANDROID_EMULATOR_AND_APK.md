# Как запускать приложение на Android эмуляторе и собирать APK

Инструкция для проекта:

```powershell
cd D:\work\vitaliy\study-motivator-apk
```

## 1. Важное про Java

На этом компьютере по умолчанию в `PATH` стоит Java 8. Android-сборка этого проекта требует Java 11 или новее.

Перед запуском сборки в PowerShell всегда выполните:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
java -version
```

В выводе должна быть Java 17 или 21, например `openjdk version "21..."`.

## 2. Запуск эмулятора

Показать доступные эмуляторы:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -list-avds
```

На этой машине есть, например:

```text
Medium_Phone
Pixel_9
```

Запустить `Pixel_9`:

```powershell
Start-Process -FilePath "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -ArgumentList @("-avd", "Pixel_9", "-netdelay", "none", "-netspeed", "full") -WindowStyle Hidden
```

Проверить, что эмулятор виден:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

Должно быть что-то вроде:

```text
emulator-5554    device
```

## 3. Запуск актуальной версии на эмуляторе

Это лучший вариант для разработки. Он собирает debug-приложение из текущего кода, ставит его на эмулятор и запускает Metro.

```powershell
cd D:\work\vitaliy\study-motivator-apk

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

npm.cmd run android
```

После успешной сборки приложение откроется на эмуляторе. Metro будет работать на:

```text
http://localhost:8081
```

Важно: не закрывайте это окно PowerShell, пока тестируете debug-версию. Если закрыть Metro, приложение может перестать обновляться или показывать ошибку подключения.

## 4. Установка уже собранного debug APK вручную

Если debug APK уже собран, его можно поставить так:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r "D:\work\vitaliy\study-motivator-apk\android\app\build\outputs\apk\debug\app-debug.apk"
```

Запустить приложение:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell monkey -p com.studymotivator.app -c android.intent.category.LAUNCHER 1
```

Путь к debug APK:

```text
D:\work\vitaliy\study-motivator-apk\android\app\build\outputs\apk\debug\app-debug.apk
```

## 5. Сборка APK для передачи/установки

### Вариант A: локальный release APK

```powershell
cd D:\work\vitaliy\study-motivator-apk\android

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

.\gradlew.bat assembleRelease
```

Готовый APK будет здесь:

```text
D:\work\vitaliy\study-motivator-apk\android\app\build\outputs\apk\release\app-release.apk
```

В текущем `android/app/build.gradle` release-сборка подписывается debug-ключом. Для публикации в Google Play нужен отдельный production keystore.

### Вариант B: локальный debug APK

```powershell
cd D:\work\vitaliy\study-motivator-apk\android

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

.\gradlew.bat assembleDebug
```

Готовый APK:

```text
D:\work\vitaliy\study-motivator-apk\android\app\build\outputs\apk\debug\app-debug.apk
```

## 6. Быстрая проверка перед сборкой

Проверить TypeScript:

```powershell
cd D:\work\vitaliy\study-motivator-apk
npx.cmd tsc --noEmit
```

Проверить подключенные устройства:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

## 7. Частые проблемы

### Ошибка: `This build uses a Java 8 JVM`

Значит PowerShell использует старую Java. Выполните:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
java -version
```

И повторите сборку.

### Ошибка: `npx.ps1 cannot be loaded`

Используйте `npx.cmd`, а не `npx`:

```powershell
npx.cmd tsc --noEmit
```

### Эмулятор не виден

Проверьте:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

Если список пустой, запустите эмулятор заново командой из раздела 2.

### Нужно перезапустить приложение

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell monkey -p com.studymotivator.app -c android.intent.category.LAUNCHER 1
```

