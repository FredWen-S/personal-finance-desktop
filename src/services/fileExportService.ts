import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

export async function saveTextFile(
  defaultFileName: string,
  content: string
): Promise<string | null> {
  const extension = defaultFileName.split(".").pop()?.toLowerCase();
  const selectedPath = await save({
    title: "保存导出文件",
    defaultPath: defaultFileName,
    filters: [
      {
        name: extension === "json" ? "JSON" : "CSV",
        extensions: extension ? [extension] : []
      }
    ]
  });

  if (!selectedPath) {
    return null;
  }

  await writeTextFile(selectedPath, content);

  return selectedPath;
}
