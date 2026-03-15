# Asset Integration and Animation Retargeting

This guide covers import settings, animation retargeting, and validation workflow for production assets replacing placeholders.

## 1. Import Settings Checklist

Apply these defaults to all incoming meshes:

- Scale factor: `1.0` (author in meters)
- Preserve hierarchy: enabled
- Normals: import
- Tangents: calculate (mikktspace)
- Read/Write: disabled unless runtime mesh modification is required
- Optimize mesh data: enabled
- Generate colliders: disabled (use authored/simple primitives)

For skinned characters:

- Rig: Humanoid (if compatible) else Generic
- Optimize game objects: enabled after validating attachment bones
- Avatar definition:
  - main character source: `Create From This Model`
  - all variants/skins: `Copy From Other Avatar`

For animation clips:

- Bake root transform according to gameplay design:
  - in-place clips (idle/locomotion blend tree): bake XZ
  - root motion action clips (tackles/jumps if needed): preserve authored root
- Loop Time enabled for cyclic locomotion
- Loop Pose enabled when visually stable
- Keyframe reduction: medium/high with visual check in gameplay camera

## 2. Retargeting Workflow

1. Import source character and create canonical avatar (`CHR_Player`).
2. Validate humanoid mapping (green bones in avatar config).
3. Import animation FBX files named `ANM_<Character>_<Action>`.
4. For each clip importer:
   - set `Rig > Avatar Definition = Copy From Other Avatar`
   - assign canonical avatar
5. Validate foot placement and upper body twist in preview.
6. Add clips to runtime controller/state machine.
7. Run `Tools/Asset Pipeline/Validate Assets` before commit.

## 3. LOD and Fallback Verification

Each runtime mesh prefab should include LODs at minimum:

- Character and ball: `LOD0 + LOD1`
- Environment modules: `LOD0 + LOD1 + optional LOD2`

Recommended screen relative transition heights:

- Character: `0.6 -> 0.25 -> culled`
- Ball: `0.7 -> 0.2 -> culled`
- Field/Stadium: `0.5 -> 0.2 -> 0.05/cull`

Verification steps:

1. Open generated placeholder prefab.
2. Check `LODGroup` renderers are assigned and ordered correctly.
3. Move Scene camera away; ensure renderer switches down LOD and eventually culls.
4. Run validator to assert required LOD count is present.

## 4. Runtime Collision Integration

Placeholder assets ship with primitive colliders only:

- Player: capsule
- Ball: sphere
- Field/stadium: box compounds

When replacing placeholders, keep primitive gameplay colliders and avoid mesh colliders for moving actors.

## 5. Reproducible Pipeline Commands

Use editor menu entries:

- `Tools/Asset Pipeline/Generate Placeholder Assets`
- `Tools/Asset Pipeline/Validate Assets`

Batch/CI validation:

```bash
<UnityExecutable> -batchmode -quit -projectPath <ProjectPath> -executeMethod AssetPipelineValidation.RunFromCommandLine
```

A non-zero exit code indicates naming, texture, collider, or LOD validation failures.
