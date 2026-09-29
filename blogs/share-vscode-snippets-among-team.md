# Make VS Code Snippets Shareable in Teams

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2024-06-20
- Language: en
- Canonical: https://coiggahou2002.github.io/blogs/share-vscode-snippets-among-team/
- Chinese version: https://coiggahou2002.github.io/zh/blogs/share-vscode-snippets-among-team/

# Make VS Code snippets shareable and contributable in teams

## What is code snippets?

Code snippets are templates that make it easier to enter repeating code patterns, such as loops or conditional-statements.

## User-defined Snippets

VS Code allows users to define their own [snippets](https://code.visualstudio.com/docs/editor/userdefinedsnippets) in these levels:
- **Global Snippets** applies to every file regardless of the language they use
- **Language-Level Snippets** applies to specific language, like `javascript.json` configures snippets which only available to JavaScript etc.
- **Project-Level Snippets** only enabled in current project directory

## Examples

JavaScript/TypeScript
```json
{
    "Print to console with variable name": {
        "prefix": "ll",
        "body": [
            "console.log('🔥 $1', $1);",
        ],
        "description": "Log output to console"
    },
    "Mark Todo": {
        "prefix": "td",
        "body": [
            "// TODO: $1",
        ]
    }
}
```

React Native
```json
{
    "useCallback": {
        "prefix": "ucb",
        "body": [
            "const $1 = useCallback(() => {",
            "  $2",
            "}, []);",
        ]
    },
    "useMemo": {
        "prefix": "umo",
        "body": [
            "const $1 = useMemo(() => {",
            "  $2",
            "  return (",
            "	$3",
            "  );",
            "}, []);",
        ]
    },
    "useEffect": {
        "prefix": "ueff",
        "body": [
            "useEffect(() => {",
            "  $1",
            "}, []);",
        ],
    }
}
```

## Sharing snippets

Snippets can be easily shared between teams by placing the Snippets configuration file in the .vscode directory of your project.

To enable project-level snippets, you need two steps:
1. Install [Project Snippets](https://marketplace.visualstudio.com/items?itemName=rebornix.project-snippets) extension in VS Code
2. Place the snippets configuration file (`${languageId}.json`) under `.vscode/snippets/`
3. Remove `.vscode/snippets` from `.gitignore` to make it commitable and contributable

Here is an example 👇
```bash
/
├── .vscode
│   └── snippets
│       ├── typescriptreact.json
│       ├── typescript.json
│       ├── vue.json
│       └── ...
├── src
│   ├── hooks
│   ├── components
│   ├── types
│   └── ...
└── package.json
```
