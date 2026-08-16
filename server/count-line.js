const fs = require('fs');
const path = require('path');

// 需要统计的代码文件扩展名
const codeExtensions = new Set([
  '.js', '.ts', '.jsx', '.tsx',
  '.vue', '.html', '.css', '.scss',
  '.json', '.xml', '.md', '.php',
  '.py', '.java', '.c', '.cpp',
  '.h', '.swift', '.rb', '.go'
]);

/**
 * 统计项目代码行数（自动跳过 node_modules 和非代码文件）
 * @param {string} startPath 起始目录路径
 * @returns {number} 总代码行数
 */
function countProjectLines(startPath) {
  let totalLines = 0;


  function traverse(currentPath) {
    const files = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(currentPath, file.name);

      if (file.isDirectory()) {
        if (file.name === 'node_modules') continue;
        traverse(filePath);
      } else {
        // 获取文件扩展名并转换为小写
        const ext = path.extname(filePath).toLowerCase();

        // 跳过非代码文件
        if (!codeExtensions.has(ext)) continue;

        try {
          const content = fs.readFileSync(filePath, 'utf8');
          totalLines += content.split(/\r?\n/).length;
        } catch (err) {
          // 跳过无法读取的文件
        }
      }
    }
  }

  traverse(startPath);
  return totalLines;
}

// 命令行参数处理
const [_, __, projectPath = '.'] = process.argv;
console.log('代码统计包含扩展名:', [...codeExtensions].join(' '));
console.log('总代码行数:', countProjectLines(path.resolve(projectPath)));
