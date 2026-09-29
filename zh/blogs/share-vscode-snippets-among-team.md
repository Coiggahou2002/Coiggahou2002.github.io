# 在团队中共享 VS Code 代码片段

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2024-06-20 (Asia/Shanghai; 2024-06-20T00:00:00.000Z)
- Language: zh-CN
- Canonical: https://coiggahou2002.github.io/zh/blogs/share-vscode-snippets-among-team/
- English version: https://coiggahou2002.github.io/blogs/share-vscode-snippets-among-team/

## 什么是代码片段?

代码片段是可以更轻松地输入重复代码模式（例如循环或条件语句）的模板。

## 用户自定义代码片段

VS Code 允许用户在以下级别定义自己的代码片段：
- 全局片段适用于每个文件（语言无关）
- 语言级片段适用于特定语言，例如 javascript.json 配置仅适用于 JavaScript 文件。
- 项目级片段仅在当前项目目录中生效
VS Code allows users to define their own [snippets](https://code.visualstudio.com/docs/editor/userdefinedsnippets) in these levels:

## 一些例子

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

## 共享代码片段

通过将代码片段配置文件放置在项目的 .vscode 目录中，可以在团队之间轻松共享代码片段。

要启用项目级片段，您需要两个步骤：
1. 在 VS Code 中安装[Project Snippets](https://marketplace.visualstudio.com/items?itemName=rebornix.project-snippets)扩展
2. 将代码片段配置文件 (`${languageId}.json`) 放在 `.vscode/snippets/` 目录下
3. 从 `.gitignore` 中删除 `.vscode/snippets`, 让代码片段提交能够被 git 识别，以便于团队成员作贡献

目录具体例子如下 👇
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
