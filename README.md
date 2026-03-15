# Project Repository

This repository includes lightweight automation and templates to keep game development workflows healthy and mobile-ready.

## Local Mobile Build Preflight Checklist

Run through this checklist before cutting a mobile verification build.

### 1) Target platform settings
- [ ] **Android** target enabled and packaging target architecture selected (ARM64 at minimum).
- [ ] **iOS** target enabled with correct signing team/profile and minimum supported OS version.
- [ ] Device orientation and aspect-ratio handling verified for intended gameplay mode(s).
- [ ] Input mappings validated for touch and on-screen controls.

### 2) Performance profile readiness
- [ ] Mobile/default scalability profile selected and committed for the build configuration.
- [ ] Dynamic shadows, post-processing, and expensive real-time effects reviewed for mobile budgets.
- [ ] Frame pacing target established (30/60 FPS) and test scene profiled against that budget.
- [ ] Startup time and memory footprint checked on at least one representative target device.

### 3) Texture and rendering limits
- [ ] Texture LOD groups and maximum texture size reviewed for mobile memory constraints.
- [ ] Compression formats configured per platform (for example, ASTC/ETC2 for Android).
- [ ] Mip generation and streaming behavior validated for high-motion gameplay scenarios.
- [ ] Overdraw hotspots and translucent materials reviewed on gameplay-critical scenes.

### 4) Build and packaging sanity
- [ ] Development and shipping/mobile test configurations both package successfully.
- [ ] Required startup maps/scenes are included in packaging lists.
- [ ] Crash reporting and logging level are appropriate for test distribution.
- [ ] Build artifacts install and launch cleanly on physical Android and iOS test devices.

## Repository Health Automation

CI workflow: `.github/workflows/repo-health.yml`

- Validates core repository structure and planning documents.
- Runs engine-aware non-interactive checks where possible.
- Runs lightweight static checks for C# and C++/Blueprint naming conventions.
