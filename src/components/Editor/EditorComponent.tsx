/*
Copyright © 2024 Narvik Contributors.

This file is part of Narvik Editor.

Narvik Editor is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Narvik Editor is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Narvik Editor. If not, see <https://www.gnu.org/licenses/>. 
*/

import { createSignal, onMount } from "solid-js";
import Prism from "prismjs";
import { getClosingChar } from "../../utils/char";
import styles from "./EditorComponent.module.css";
import "./themes/dark.css";

// PrismJS plugins
import "prismjs/plugins/match-braces/prism-match-braces.min.js";
import "prismjs/plugins/autoloader/prism-autoloader.min.js";
import { fs } from "@tauri-apps/api";
import { setSavedTabs } from "./components/EditorTabs";

interface Props {
  lang: string;
}

let filePath: string;
const [fileSaved, setFileSaved] = createSignal<string[]>([]); // array of paths containing files that are saved. Local version of savedTabs() in EditorTabs.tsx
const [fileSavedContent, setFileSavedContent] = createSignal<string[][]>([]); // the first item is the path, second is saved content, and third is changed content.
// fileSavedContent is different from fileSaved, because the latter contains only saved files' paths, while fileSavedContent contains all active files' paths.
// it's like the tracking array.

const [lines, setLines] = createSignal(["1"]);

export const getSavedFiles = () => {
  return fileSaved();
};

export const saveFile = () => {
  const textarea = document.getElementById("editing") as HTMLTextAreaElement;
  if (
    textarea.value &&
    fileSavedContent()[
      fileSavedContent().findIndex((i) => i.includes(filePath))
    ][1] != textarea.value // checks if textarea.value exists, and if the saved content is equal to textarea.value
  ) {
    fs.writeFile(filePath, textarea.value);
    setFileSaved([...fileSaved(), filePath]);
    fileSavedContent()[
      fileSavedContent().findIndex((i) => i.includes(filePath))
    ][1] = textarea.value; // sets the saved content value to textarea value

    setSavedTabs(fileSaved()); // updates savedTabs() signal in EditorTabs.tsx
  }
};

export const openFile = (path: string) => {
  const textarea = document.getElementById("editing") as HTMLTextAreaElement;
  if (path === "narvik:settings") {
    // TODO: add settings
  } else {
    if (
      !fileSaved().includes(path) &&
      !fileSavedContent().flat().includes(path) // checks if open file already exists as tab
    ) {
      setFileSaved([...fileSaved(), path]); // adds path to saved files array
    }

    fs.readTextFile(path).then((data) => {
      filePath = path;

      if (!fileSavedContent().flat().includes(path)) {
        // flattens fileSavedContent array and checks if open file's path exists there. So basically checks if open file is being tracked for changes
        setFileSavedContent([...fileSavedContent(), [path, data, data]]); // if not tracked, add it to tracking array
        textarea.value = data; // sets textarea value to value read from the open file
      } else {
        textarea.value =
          fileSavedContent()[
            fileSavedContent().findIndex((i) => i.includes(path))
          ][2]; // if already tracked, set textarea value to be the changed value, because the open file may not be saved. If saved, its value would be same as saved value.
      }

      highlightContent();
      updateLineNumbers();
    });
    setSavedTabs(fileSaved()); // syncs savedTabs() signal in EditorTabs.tsx with fileSaved()
  }
};

// update line numbers
const updateLineNumbers = () => {
  const textareaRef = document.getElementById("editing") as HTMLTextAreaElement;
  if (textareaRef) {
    const linesArray = textareaRef.value.split("\n");
    const lineNumbers = Array.from({ length: linesArray.length }, (_, i) =>
      (i + 1).toString(),
    );
    setLines(lineNumbers);
  }
};

const highlightContent = () => {
  const textareaRef = document.getElementById("editing") as HTMLTextAreaElement;
  const highlightedContent = document.getElementById("highlighting-content");

  // [start] source (with modifications): https://css-tricks.com/creating-an-editable-textarea-that-supports-syntax-highlighted-code/

  if (textareaRef) {
    let fixLastLine = false;
    const selectionStart = textareaRef.selectionStart;

    if (textareaRef.value[textareaRef.value.length - 1] == "\n") {
      textareaRef.value = textareaRef.value + " ";
      fixLastLine = true;
    }

    if (highlightedContent) {
      highlightedContent.innerHTML = textareaRef.value
        .replace(new RegExp("&", "g"), "&amp;")
        .replace(new RegExp("<", "g"), "&lt;");

      Prism.highlightElement(highlightedContent);
    }

    if (fixLastLine && textareaRef.value[textareaRef.value.length - 1] == " ") {
      textareaRef.value = textareaRef.value.substring(
        0,
        textareaRef.value.length - 1,
      );

      textareaRef.selectionStart = textareaRef.selectionEnd = selectionStart;
    }
  }

  // [end]
};

const EditorComponent = (props: Props) => {
  const [selectedLine, setSelectedLine] = createSignal(-1);

  let lineNumbersDiv: HTMLElement | null;
  let highlightedContent: HTMLElement | null;
  let highlightedContentPre: HTMLElement | null;
  let highlightedLine: HTMLElement | null;
  let textareaRef: HTMLTextAreaElement | undefined;

  onMount(() => {
    lineNumbersDiv = document.getElementById("line-numbers");
    highlightedContent = document.getElementById("highlighting-content");
    highlightedContentPre = document.getElementById("highlighting");
    highlightedLine = document.getElementById("highlighted-line");

    if (highlightedLine) {
      highlightedLine.style.height = "0";
    }
  });

  // highlights selected line
  const updateSelectedLine = () => {
    setTimeout(() => {
      // renders on next frame because some values may not be updated yet.
      if (textareaRef) {
        const start = textareaRef.selectionStart;
        const value = textareaRef.value;
        const lineNumber = value.substring(0, start).split("\n").length; // gets line number from index of new lines.

        setSelectedLine(lineNumber);
      }
    }, 0);

    if (highlightedLine) {
      highlightedLine.style.height = "1.5em";
    }
  };

  const calcHighlightLinePos = () => {
    if (highlightedLine && textareaRef) {
      highlightedLine.style.top = `calc(${selectedLine() - 1} * 1.5rem - ${highlightedContentPre?.scrollTop}px)`;
      highlightedLine.style.height = "1.5em";

      const highlightedLinePos = highlightedLine.getBoundingClientRect();
      const textareaPos = textareaRef.getBoundingClientRect();
      if (highlightedLinePos.top < textareaPos.top) {
        highlightedLine.style.height = `calc(1.5em - (${textareaPos.top}px - ${highlightedLinePos.top}px))`;
        highlightedLine.style.top = "0";
      } else if (highlightedLinePos.bottom > textareaPos.bottom) {
        highlightedLine.style.height = `calc(${textareaPos.bottom}px - ${highlightedLinePos.top}px)`;
      } else {
        highlightedLine.style.height = "1.5em";
      }
    }
  };

  // updates <code> content for syntax highlighting
  const updateContent = () => {
    highlightContent();
    updateLineNumbers();
    updateSelectedLine();
  };

  const handleInput = () => {
    updateContent();
    handleScroll();

    if (textareaRef) {
      fileSavedContent()[
        fileSavedContent().findIndex((i) => i.includes(filePath))
      ][2] = textareaRef.value; // sets updated value in tracking array to be same as textarea value

      if (
        fileSavedContent()[
          fileSavedContent().findIndex((i) => i.includes(filePath))
        ][1] === textareaRef.value // checks if saved value is same as textarea value
      ) {
        // sets signals to know this file is saved
        setFileSaved([...fileSaved(), filePath]);
        setSavedTabs(fileSaved());
      } else {
        fileSaved().splice(fileSaved().indexOf(filePath), 1); // removes this file from fileSaved array, since this file has changes.
        setSavedTabs(fileSaved()); // syncs signals
      }
    }
  };
  const handleBlur = () => {
    setSelectedLine(-1);

    if (highlightedLine) {
      highlightedLine.style.height = "0";
    }
  };

  const handleScroll = () => {
    if (lineNumbersDiv && highlightedContentPre && textareaRef) {
      highlightedContentPre.scrollTop = textareaRef.scrollTop;
      highlightedContentPre.scrollLeft = textareaRef.scrollLeft;

      lineNumbersDiv.scrollTop = highlightedContentPre.scrollTop;

      calcHighlightLinePos();
    }
  };

  // handle custom functions on specific key presses
  const handleKeyDown = (e: KeyboardEvent) => {
    const textarea = e.target as HTMLTextAreaElement;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const value = textarea.value;

    const openingBrackets = ["(", "[", "{"];
    const charsWithClosingChars = [...openingBrackets, '"', "'"];

    let newStart = selectionStart; // this is used in arrow key cases

    switch (e.key) {
      case "Tab":
        e.preventDefault();

        const updatedValue =
          value.substring(0, selectionStart) +
          "\t" +
          value.substring(selectionEnd);

        textarea.value = updatedValue;

        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;

        updateContent();

        break;

      case "ArrowUp":
      case "ArrowLeft":
        const prevLineStart = value.indexOf("\n", selectionEnd);
        newStart = prevLineStart === -1 ? value.length - 1 : prevLineStart - 1;

        updateLineNumbers();
        updateSelectedLine();

        break;

      case "ArrowDown":
        const nextLineStart = value.indexOf("\n", selectionEnd);
        newStart = nextLineStart === -1 ? value.length : nextLineStart + 1;

        updateLineNumbers();
        updateSelectedLine();

        break;

      case "ArrowRight":
        if (value[selectionEnd] === "\n") {
          const nextLineStart = value.indexOf("\n", selectionEnd);
          newStart = nextLineStart === -1 ? value.length : nextLineStart + 1;
        }

        updateLineNumbers();
        updateSelectedLine();

        break;

      case "Enter":
        if (
          openingBrackets.includes(
            textarea.value.charAt(textarea.selectionStart - 1),
          )
        ) {
          e.preventDefault();

          const updatedValue =
            value.substring(0, selectionStart) +
            "\n\t\n" +
            value.substring(selectionEnd);

          textarea.value = updatedValue;

          textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;

          updateContent();
          setTimeout(() => calcHighlightLinePos(), 0);
        }

        updateLineNumbers();
        updateSelectedLine();

        break;

      case "Backspace":
        if (
          charsWithClosingChars.includes(
            textarea.value.charAt(selectionStart - 1),
          ) &&
          textarea.value.charAt(selectionStart) ===
            getClosingChar(textarea.value.charAt(selectionStart - 1))
        ) {
          e.preventDefault();

          const updatedValue =
            textarea.value.substring(0, selectionStart - 1) +
            textarea.value.substring(selectionStart + 1);

          textarea.value = updatedValue;

          textarea.selectionStart = textarea.selectionEnd = selectionStart - 1;

          updateContent();
        }

        break;
    }

    if (charsWithClosingChars.includes(e.key)) {
      e.preventDefault();
      const newValue =
        value.substring(0, selectionStart) +
        e.key +
        getClosingChar(e.key) +
        value.substring(selectionEnd);

      textarea.value = newValue;
      textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      updateContent();
    }

    handleScroll();
  };

  // FIXME: make this more efficient, and fix positioning issues, so this doesn't rely on parent element's position styles

  return (
    <div class="flex h-full w-full select-none">
      <div class="relative">
        <div
          id="line-numbers"
          class={`relative m-0 flex h-full w-[64px] min-w-[64px] max-w-[64px] select-none flex-col overflow-y-hidden bg-base-200 p-3 pt-0 text-right text-base text-content`}
        >
          {lines().map((line) => (
            <div class="flex">
              <div class={`w-full pl-[10px] text-right ${styles.lineNumber}`}>
                {line}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        class="relative flex w-full flex-grow flex-col"
        id="editor-container"
      >
        <div
          id="highlighted-line"
          class="pointer-events-none absolute z-50 h-[1.5rem] w-full bg-content opacity-10"
          style={{
            top: `calc(${selectedLine() - 1} * 1.5rem - ${textareaRef?.scrollTop}px)`,
          }}
        ></div>
        <textarea
          ref={textareaRef}
          id="editing"
          onInput={handleInput}
          onkeydown={handleKeyDown}
          onmousedown={updateSelectedLine}
          onscroll={handleScroll}
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
          onfocus={updateSelectedLine}
          onblur={handleBlur}
          onselect={handleBlur}
          class={`z-10 bg-transparent text-transparent caret-content ${styles.textarea}`}
        ></textarea>
        <pre
          id="highlighting"
          aria-hidden="true"
          class={`z-0 bg-base-200 text-content ${styles.highlighted}`}
        >
          {/* match-braces doesn't work */}
          <code
            class={`language-${props.lang} match-braces rainbow-braces select-none`}
            id="highlighting-content"
          ></code>
        </pre>
      </div>
    </div>
  );
};

export default EditorComponent;
