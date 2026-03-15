using UnityEditor;
using UnityEngine;

public static class PlaceholderAssetPipeline
{
    private const string RootFolder = "Assets/Placeholders";

    [MenuItem("Tools/Asset Pipeline/Generate Placeholder Assets")]
    public static void GeneratePlaceholderAssets()
    {
        EnsureFolder("Assets", "Placeholders");
        EnsureFolder(RootFolder, "Characters");
        EnsureFolder(RootFolder, "Props");
        EnsureFolder(RootFolder, "Environment");
        EnsureFolder(RootFolder, "Materials");
        EnsureFolder(RootFolder, "Textures");

        var playerMaterial = CreateMobileMaterial("MAT_Mobile_Player", new Color(0.2f, 0.5f, 0.9f));
        var ballMaterial = CreateMobileMaterial("MAT_Mobile_Ball", new Color(0.9f, 0.9f, 0.95f));
        var fieldMaterial = CreateMobileMaterial("MAT_Mobile_Field", new Color(0.2f, 0.7f, 0.25f));
        var stadiumMaterial = CreateMobileMaterial("MAT_Mobile_Stadium", new Color(0.55f, 0.55f, 0.6f));

        AssignPlaceholderTexture(playerMaterial, "CHR_Player_Body_Albedo", new Color(0.2f, 0.5f, 0.9f));
        AssignPlaceholderTexture(ballMaterial, "PRP_Ball_Surface_Albedo", new Color(0.9f, 0.9f, 0.95f));
        AssignPlaceholderTexture(fieldMaterial, "ENV_Field_Grass_Albedo", new Color(0.2f, 0.7f, 0.25f));
        AssignPlaceholderTexture(stadiumMaterial, "ENV_Stadium_Concrete_Albedo", new Color(0.55f, 0.55f, 0.6f));

        CreatePlayerPrefab(playerMaterial);
        CreateBallPrefab(ballMaterial);
        CreateFieldPrefab(fieldMaterial);
        CreateStadiumModulePrefab(stadiumMaterial);

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();

        Debug.Log("Placeholder asset pipeline generated player, ball, field, and stadium modules.");
    }

    private static Material CreateMobileMaterial(string materialName, Color color)
    {
        var materialPath = $"{RootFolder}/Materials/{materialName}.mat";
        var existing = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
        if (existing != null)
        {
            return existing;
        }

        var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
        var material = new Material(shader)
        {
            name = materialName,
            color = color
        };

        if (material.HasProperty("_Metallic"))
        {
            material.SetFloat("_Metallic", 0.1f);
        }

        if (material.HasProperty("_Smoothness"))
        {
            material.SetFloat("_Smoothness", 0.3f);
        }

        AssetDatabase.CreateAsset(material, materialPath);
        return material;
    }


    private static void AssignPlaceholderTexture(Material material, string textureName, Color color)
    {
        var texturePath = $"{RootFolder}/Textures/{textureName}.asset";
        var texture = AssetDatabase.LoadAssetAtPath<Texture2D>(texturePath);
        if (texture == null)
        {
            texture = new Texture2D(2, 2, TextureFormat.RGBA32, false)
            {
                name = textureName
            };
            texture.SetPixels(new[] { color, color, color, color });
            texture.Apply();
            AssetDatabase.CreateAsset(texture, texturePath);
        }

        if (material.HasProperty("_BaseMap"))
        {
            material.SetTexture("_BaseMap", texture);
        }

        if (material.HasProperty("_MainTex"))
        {
            material.SetTexture("_MainTex", texture);
        }
    }

    private static void CreatePlayerPrefab(Material material)
    {
        var root = new GameObject("CHR_Player");
        var hips = new GameObject("Bone_Hips");
        hips.transform.SetParent(root.transform, false);

        var lod0 = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        lod0.name = "CHR_Player_LOD0";
        lod0.transform.SetParent(hips.transform, false);
        lod0.transform.localScale = new Vector3(0.9f, 1.0f, 0.9f);
        AssignMaterial(lod0, material);
        RemovePrimitiveCollider(lod0);

        var lod1 = GameObject.CreatePrimitive(PrimitiveType.Cube);
        lod1.name = "CHR_Player_LOD1";
        lod1.transform.SetParent(hips.transform, false);
        lod1.transform.localScale = new Vector3(0.8f, 1.6f, 0.8f);
        AssignMaterial(lod1, material);
        RemovePrimitiveCollider(lod1);

        AddPlayerCollider(root);
        AddLodGroup(root, lod0.GetComponent<Renderer>(), lod1.GetComponent<Renderer>(), 0.6f, 0.25f);

        SavePrefab(root, $"{RootFolder}/Characters/CHR_Player.prefab");
    }

    private static void CreateBallPrefab(Material material)
    {
        var root = new GameObject("PRP_Ball");

        var lod0 = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        lod0.name = "PRP_Ball_LOD0";
        lod0.transform.SetParent(root.transform, false);
        AssignMaterial(lod0, material);
        RemovePrimitiveCollider(lod0);

        var lod1 = GameObject.CreatePrimitive(PrimitiveType.Cube);
        lod1.name = "PRP_Ball_LOD1";
        lod1.transform.SetParent(root.transform, false);
        lod1.transform.localScale = Vector3.one * 0.8f;
        AssignMaterial(lod1, material);
        RemovePrimitiveCollider(lod1);

        var sphereCollider = root.AddComponent<SphereCollider>();
        sphereCollider.radius = 0.5f;

        AddLodGroup(root, lod0.GetComponent<Renderer>(), lod1.GetComponent<Renderer>(), 0.7f, 0.2f);
        SavePrefab(root, $"{RootFolder}/Props/PRP_Ball.prefab");
    }

    private static void CreateFieldPrefab(Material material)
    {
        var root = new GameObject("ENV_Field_Main");

        var lod0 = GameObject.CreatePrimitive(PrimitiveType.Plane);
        lod0.name = "ENV_Field_Main_LOD0";
        lod0.transform.SetParent(root.transform, false);
        lod0.transform.localScale = new Vector3(2f, 1f, 3f);
        AssignMaterial(lod0, material);
        RemovePrimitiveCollider(lod0);

        var lod1 = GameObject.CreatePrimitive(PrimitiveType.Cube);
        lod1.name = "ENV_Field_Main_LOD1";
        lod1.transform.SetParent(root.transform, false);
        lod1.transform.localScale = new Vector3(20f, 0.05f, 30f);
        AssignMaterial(lod1, material);
        RemovePrimitiveCollider(lod1);

        var boundary = new GameObject("COL_FieldBoundary");
        boundary.transform.SetParent(root.transform, false);
        var boundaryCollider = boundary.AddComponent<BoxCollider>();
        boundaryCollider.size = new Vector3(20f, 2f, 30f);
        boundaryCollider.center = new Vector3(0f, 1f, 0f);

        AddLodGroup(root, lod0.GetComponent<Renderer>(), lod1.GetComponent<Renderer>(), 0.5f, 0.2f);
        SavePrefab(root, $"{RootFolder}/Environment/ENV_Field_Main.prefab");
    }

    private static void CreateStadiumModulePrefab(Material material)
    {
        var root = new GameObject("ENV_Stadium_Section_A");

        var lod0 = GameObject.CreatePrimitive(PrimitiveType.Cube);
        lod0.name = "ENV_Stadium_Section_A_LOD0";
        lod0.transform.SetParent(root.transform, false);
        lod0.transform.localScale = new Vector3(10f, 4f, 4f);
        AssignMaterial(lod0, material);
        RemovePrimitiveCollider(lod0);

        var lod1 = GameObject.CreatePrimitive(PrimitiveType.Cube);
        lod1.name = "ENV_Stadium_Section_A_LOD1";
        lod1.transform.SetParent(root.transform, false);
        lod1.transform.localScale = new Vector3(10f, 2f, 4f);
        AssignMaterial(lod1, material);
        RemovePrimitiveCollider(lod1);

        var lod2 = GameObject.CreatePrimitive(PrimitiveType.Cube);
        lod2.name = "ENV_Stadium_Section_A_LOD2";
        lod2.transform.SetParent(root.transform, false);
        lod2.transform.localScale = new Vector3(10f, 1f, 4f);
        AssignMaterial(lod2, material);
        RemovePrimitiveCollider(lod2);

        var blocker = new GameObject("COL_StadiumBlocker");
        blocker.transform.SetParent(root.transform, false);
        var blockerCollider = blocker.AddComponent<BoxCollider>();
        blockerCollider.size = new Vector3(10f, 4f, 4f);

        var lodGroup = root.AddComponent<LODGroup>();
        lodGroup.SetLODs(new[]
        {
            new LOD(0.5f, new[] { lod0.GetComponent<Renderer>() }),
            new LOD(0.2f, new[] { lod1.GetComponent<Renderer>() }),
            new LOD(0.05f, new[] { lod2.GetComponent<Renderer>() })
        });
        lodGroup.RecalculateBounds();

        SavePrefab(root, $"{RootFolder}/Environment/ENV_Stadium_Section_A.prefab");
    }

    private static void AddPlayerCollider(GameObject root)
    {
        var colNode = new GameObject("COL_PlayerCapsule");
        colNode.transform.SetParent(root.transform, false);

        var capsule = colNode.AddComponent<CapsuleCollider>();
        capsule.height = 1.8f;
        capsule.radius = 0.35f;
        capsule.center = new Vector3(0f, 0.9f, 0f);
    }

    private static void AddLodGroup(GameObject root, Renderer lod0, Renderer lod1, float lod0Transition, float lod1Transition)
    {
        var lodGroup = root.AddComponent<LODGroup>();
        lodGroup.SetLODs(new[]
        {
            new LOD(lod0Transition, new[] { lod0 }),
            new LOD(lod1Transition, new[] { lod1 })
        });
        lodGroup.RecalculateBounds();
    }

    private static void AssignMaterial(GameObject go, Material material)
    {
        var renderer = go.GetComponent<Renderer>();
        if (renderer != null)
        {
            renderer.sharedMaterial = material;
        }
    }


    private static void RemovePrimitiveCollider(GameObject go)
    {
        var collider = go.GetComponent<Collider>();
        if (collider != null)
        {
            Object.DestroyImmediate(collider);
        }
    }

    private static void SavePrefab(GameObject tempRoot, string path)
    {
        var existing = AssetDatabase.LoadAssetAtPath<GameObject>(path);
        if (existing != null)
        {
            PrefabUtility.SaveAsPrefabAssetAndConnect(tempRoot, path, InteractionMode.AutomatedAction);
        }
        else
        {
            PrefabUtility.SaveAsPrefabAsset(tempRoot, path);
        }

        Object.DestroyImmediate(tempRoot);
    }

    private static void EnsureFolder(string parent, string child)
    {
        var fullPath = $"{parent}/{child}";
        if (!AssetDatabase.IsValidFolder(fullPath))
        {
            AssetDatabase.CreateFolder(parent, child);
        }
    }
}
