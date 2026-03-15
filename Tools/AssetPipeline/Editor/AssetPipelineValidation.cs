using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEngine;

public static class AssetPipelineValidation
{
    private static readonly Regex LodRegex = new(@".*_LOD[0-2]$", RegexOptions.Compiled);
    private static readonly Regex TextureSuffixRegex = new(@".*_(Albedo|Normal|ORM|Emissive|Mask)$", RegexOptions.Compiled);

    [MenuItem("Tools/Asset Pipeline/Validate Assets")]
    public static void ValidateFromMenu()
    {
        var issues = Validate();
        if (issues.Count == 0)
        {
            Debug.Log("Asset pipeline validation passed.");
            return;
        }

        foreach (var issue in issues)
        {
            Debug.LogError(issue);
        }

        Debug.LogError($"Asset pipeline validation failed with {issues.Count} issue(s).");
    }

    public static void RunFromCommandLine()
    {
        var issues = Validate();
        if (issues.Count == 0)
        {
            Debug.Log("Asset pipeline validation passed.");
            return;
        }

        foreach (var issue in issues)
        {
            Debug.LogError(issue);
        }

        EditorApplication.Exit(1);
    }

    private static List<string> Validate()
    {
        var issues = new List<string>();
        ValidatePrefabNamesAndLods(issues);
        ValidateMaterialTextureBindings(issues);
        ValidateTextureNamingAndSize(issues);
        ValidateColliders(issues);
        return issues;
    }

    private static void ValidatePrefabNamesAndLods(List<string> issues)
    {
        foreach (var guid in AssetDatabase.FindAssets("t:Prefab", new[] { "Assets/Placeholders" }))
        {
            var path = AssetDatabase.GUIDToAssetPath(guid);
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (prefab == null)
            {
                continue;
            }

            var lodGroup = prefab.GetComponent<LODGroup>();
            if (lodGroup == null)
            {
                issues.Add($"{path}: missing LODGroup.");
                continue;
            }

            var lods = lodGroup.GetLODs();
            if (lods.Length < 2)
            {
                issues.Add($"{path}: requires at least 2 LOD levels.");
            }

            var renderers = prefab.GetComponentsInChildren<Renderer>(true);
            foreach (var renderer in renderers)
            {
                if (!LodRegex.IsMatch(renderer.gameObject.name) && !renderer.gameObject.name.StartsWith("COL_"))
                {
                    issues.Add($"{path}: renderer '{renderer.gameObject.name}' does not follow LOD naming suffix (_LOD0/_LOD1/_LOD2).");
                }
            }
        }
    }

    private static void ValidateMaterialTextureBindings(List<string> issues)
    {
        foreach (var guid in AssetDatabase.FindAssets("t:Material", new[] { "Assets/Placeholders/Materials" }))
        {
            var path = AssetDatabase.GUIDToAssetPath(guid);
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                continue;
            }

            var hasBaseMap = HasTexture(material, "_BaseMap") || HasTexture(material, "_MainTex");
            if (!hasBaseMap)
            {
                issues.Add($"{path}: missing albedo/base map texture assignment.");
            }

            if (HasProperty(material, "_BumpMap") && material.GetTexture("_BumpMap") == null)
            {
                issues.Add($"{path}: missing normal map assignment.");
            }
        }
    }

    private static void ValidateTextureNamingAndSize(List<string> issues)
    {
        foreach (var guid in AssetDatabase.FindAssets("t:Texture2D", new[] { "Assets/Placeholders" }))
        {
            var path = AssetDatabase.GUIDToAssetPath(guid);
            var texture = AssetDatabase.LoadAssetAtPath<Texture2D>(path);
            if (texture == null)
            {
                continue;
            }

            var textureName = System.IO.Path.GetFileNameWithoutExtension(path);
            if (!TextureSuffixRegex.IsMatch(textureName))
            {
                issues.Add($"{path}: texture name must include one of _Albedo/_Normal/_ORM/_Emissive/_Mask.");
            }

            var maxSize = GetExpectedTextureMaxSize(path);
            if (texture.width > maxSize || texture.height > maxSize)
            {
                issues.Add($"{path}: size {texture.width}x{texture.height} exceeds max budget {maxSize}.");
            }
        }
    }

    private static void ValidateColliders(List<string> issues)
    {
        foreach (var guid in AssetDatabase.FindAssets("t:Prefab", new[] { "Assets/Placeholders" }))
        {
            var path = AssetDatabase.GUIDToAssetPath(guid);
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (prefab == null)
            {
                continue;
            }

            var colliders = prefab.GetComponentsInChildren<Collider>(true);
            if (!colliders.Any())
            {
                issues.Add($"{path}: missing collision primitives.");
            }

            foreach (var collider in colliders)
            {
                if (!collider.gameObject.name.StartsWith("COL_") && collider.gameObject != prefab)
                {
                    issues.Add($"{path}: collider object '{collider.gameObject.name}' should use COL_ prefix.");
                }
            }
        }
    }

    private static int GetExpectedTextureMaxSize(string path)
    {
        var lower = path.ToLowerInvariant();
        if (lower.Contains("characters"))
        {
            return 1024;
        }

        if (lower.Contains("props") || lower.Contains("ball"))
        {
            return 512;
        }

        if (lower.Contains("field") || lower.Contains("stadium") || lower.Contains("environment"))
        {
            return 1024;
        }

        return 1024;
    }

    private static bool HasTexture(Material material, string property)
    {
        return HasProperty(material, property) && material.GetTexture(property) != null;
    }

    private static bool HasProperty(Material material, string property)
    {
        return material.shader != null && material.HasProperty(property);
    }
}
