const fs = require("fs");
const path = require("path");

// 需要统计的代码文件扩展名
const codeExtensions = new Set([
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".vue",
  ".html",
  ".css",
  ".scss",
  ".less",
  ".json",
  ".xml",
  ".md",
  ".php",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".swift",
  ".rb",
  ".go",
]);

// 需要跳过的目录
const skipDirs = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  "coverage",
  ".angular",
  ".vscode",
  "__pycache__",
  "venv",
  "env",
  ".venv",
]);

// 统计信息
const stats = {
  totalLines: 0,
  fileCount: 0,
  dirCount: 0,
  totalFiles: 0, // 总文件数（用于进度条）
  fileStats: {}, // 按扩展名统计
  startTime: Date.now(),
};

/**
 * 清除当前行并输出新内容（实现实时更新效果）
 */
function updateDisplay(currentFile, isFinal = false) {
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);

  if (isFinal) {
    // 清除进度行（使用 Node.js 原生 API，兼容性更好）
    process.stdout.clearLine();
    process.stdout.cursorTo(0);

    // 最终输出，不清除
    console.log("\n✅ 统计完成！");
    console.log("━".repeat(60));
    console.log(`📊 总代码行数: ${stats.totalLines.toLocaleString()}`);
    console.log(`📁 扫描目录数: ${stats.dirCount.toLocaleString()}`);
    console.log(`📄 扫描文件数: ${stats.fileCount.toLocaleString()}`);
    console.log(`⏱️  耗时: ${elapsed}秒`);
    console.log("━".repeat(60));
    console.log("📋 按文件类型统计:");

    // 按行数排序显示
    const sorted = Object.entries(stats.fileStats).sort(
      (a, b) => b[1].lines - a[1].lines,
    );

    for (const [ext, data] of sorted) {
      const percentage = ((data.lines / stats.totalLines) * 100).toFixed(1);
      console.log(
        `   ${ext.padEnd(8)} ${data.lines.toLocaleString().padStart(10)} 行  (${data.files} 个文件, ${percentage}%)`,
      );
    }
    console.log("━".repeat(60));
  } else {
    // 实时更新，使用进度条显示
    const percentage =
      stats.totalFiles > 0
        ? ((stats.fileCount / stats.totalFiles) * 100).toFixed(1)
        : "0.0";
    const barLength = 30;
    const filledLength =
      Math.round((barLength * stats.fileCount) / stats.totalFiles) || 0;
    const bar = "█".repeat(filledLength) + "░".repeat(barLength - filledLength);

    const display = `⏳ [${bar}] ${percentage}% | 文件: ${stats.fileCount} | 行数: ${stats.totalLines.toLocaleString()} | ${elapsed}s`;
    // 使用足够多的空格确保覆盖之前的内容
    process.stdout.write("\r" + display + " ".repeat(20));
  }
}

/**
 * 统计项目代码行数（实时反馈进度）
 * @param {string} startPath 起始目录路径
 */
function countProjectLines(startPath) {
  console.log("🚀 开始统计代码行数...");
  console.log("📌 包含扩展名:", [...codeExtensions].join(" "));
  console.log("🚫 跳过目录:", [...skipDirs].join(" "));
  console.log("");

  // 第一步：预扫描，计算总文件数
  console.log("📊 正在计算文件总数...");
  function countFiles(currentPath) {
    const files = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(currentPath, file.name);
      if (file.isDirectory()) {
        if (skipDirs.has(file.name)) continue;
        countFiles(filePath);
      } else {
        const ext = path.extname(filePath).toLowerCase();
        if (codeExtensions.has(ext)) {
          stats.totalFiles++;
        }
      }
    }
  }
  countFiles(startPath);
  console.log(`📄 共找到 ${stats.totalFiles} 个代码文件\n`);

  // 第二步：实际统计
  function traverse(currentPath) {
    const files = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(currentPath, file.name);

      if (file.isDirectory()) {
        if (skipDirs.has(file.name)) continue;
        stats.dirCount++;
        traverse(filePath);
      } else {
        const ext = path.extname(filePath).toLowerCase();

        if (!codeExtensions.has(ext)) continue;

        try {
          const content = fs.readFileSync(filePath, "utf8");
          const lines = content.split(/\r?\n/).length;

          stats.totalLines += lines;
          stats.fileCount++;

          // 按扩展名统计
          if (!stats.fileStats[ext]) {
            stats.fileStats[ext] = { lines: 0, files: 0 };
          }
          stats.fileStats[ext].lines += lines;
          stats.fileStats[ext].files++;

          // 每处理50个文件更新一次显示（减少输出频率）
          if (stats.fileCount % 50 === 0) {
            updateDisplay(filePath);
          }
        } catch (err) {
          // 跳过无法读取的文件
        }
      }
    }
  }

  traverse(startPath);
  updateDisplay("", true);
}

// 命令行参数处理
const [_, __, projectPath = "."] = process.argv;
countProjectLines(path.resolve(projectPath));
