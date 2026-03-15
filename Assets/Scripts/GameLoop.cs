using UnityEngine;

public class GameLoop : MonoBehaviour
{
    [SerializeField] private float matchDurationSeconds = 90f;
    private float elapsed;

    private void Start()
    {
        Debug.Log("GameLoop initialized. Match started.");
    }

    private void Update()
    {
        elapsed += Time.deltaTime;
        if (elapsed >= matchDurationSeconds)
        {
            Debug.Log("Match complete.");
            enabled = false;
        }
    }
}
