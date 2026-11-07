"use client";
import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";
import { indentWithTab } from "@codemirror/commands";
import { keymap } from "@codemirror/view";
import { useProgress } from "@/lib/store";

export default function CodeEditor({ value, onChange, readOnly = false }: { value: string; onChange?: (v: string) => void; readOnly?: boolean }) {
  const theme = useProgress((s) => s.theme);
  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={theme === "dark" ? oneDark : "light"}
      extensions={[cpp(), keymap.of([indentWithTab])]}
      onChange={onChange}
      readOnly={readOnly}
      basicSetup={{ foldGutter: false, highlightActiveLine: false, autocompletion: false }}
      style={{ height: "100%" }}
    />
  );
}
