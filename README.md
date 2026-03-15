# Mobile Football Prototype (Unity URP Baseline)

This repository now contains a baseline Unity project scaffolded for a mobile football prototype.

## Engine + Rendering
- **Engine target:** Unity 2022.3 LTS (or newer 2022/2023 version that supports the included manifest)
- **Render pipeline:** Universal Render Pipeline (URP) dependency added in `Packages/manifest.json`
- **Mobile targets:** Android + iOS build settings documented and pre-seeded in `ProjectSettings/ProjectSettings.asset`

## Included Structure
- `Assets/Scenes` – initial playable scene (`MainField.unity`)
- `Assets/Scripts` – game loop script (`GameLoop.cs`)
- `Assets/Prefabs` – placeholder prefabs (`PlayerPlaceholder.prefab`, `Football.prefab`)
- `Assets/Materials`, `Assets/Animations`, `Assets/UI`, `Assets/Audio`, `Assets/Art` – baseline content folders for production assets

## Scene Baseline
`Assets/Scenes/MainField.unity` includes:
- A field plane
- A main camera
- A directional light
- Placeholder player + football objects
- A `GameLoop` object using `GameLoop.cs`

## Open the Project
1. Install **Unity Hub** and add a Unity editor version in the 2022.3 LTS line.
2. In Unity Hub, click **Open** and select this repository root.
3. Let Unity import packages and generate local caches.
4. Open `Assets/Scenes/MainField.unity`.

## Run in Editor
1. Press **Play** in the Unity editor.
2. The `GameLoop` logs startup and tracks simple elapsed match time in the Console.

## Build for Android
1. In Unity Hub, ensure **Android Build Support** is installed for your editor version.
2. Open **File > Build Settings** and choose **Android**.
3. Click **Switch Platform**.
4. Confirm `MainField` is in *Scenes In Build*.
5. Configure signing + package settings in **Project Settings > Player > Android**.
6. Click **Build** (APK/AAB) or **Build And Run**.

## Build for iOS
1. In Unity Hub, ensure **iOS Build Support** is installed.
2. Open **File > Build Settings** and choose **iOS**.
3. Click **Switch Platform**.
4. Confirm `MainField` is in *Scenes In Build*.
5. Click **Build** to export an Xcode project.
6. Open exported project in Xcode, configure signing/team, then run/archive.

## Version Control Notes
- This repo intentionally tracks **source assets + config** only.
- Engine-generated folders (Library/Temp/Obj/Build, etc.) are ignored via `.gitignore`.
