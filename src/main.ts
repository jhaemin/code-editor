import { open, save } from '@tauri-apps/api/dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/api/fs'
import { appWindow } from '@tauri-apps/api/window'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker()
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker()
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  },
}

let codeEditor: monaco.editor.IStandaloneCodeEditor
let filePath: string | null = null

const setLanguage = (
  language: 'javascript' | 'typescript' | 'html' | 'css' | 'js' | 'ts'
) => {
  const languageDom = document.getElementById('language') as HTMLSelectElement
  const convertedLanguage =
    language === 'js'
      ? 'javascript'
      : language === 'ts'
      ? 'typescript'
      : language

  languageDom.value = convertedLanguage

  const newModel = monaco.editor.createModel(
    codeEditor.getValue(),
    convertedLanguage
  )

  codeEditor.setModel(newModel)
}

const openFile = async (path: string) => {
  const extension = path.split('.').pop()
  const file = await readTextFile(path)

  setLanguage(extension as any)
  codeEditor.setValue(file)

  filePath = path
  appWindow.setTitle(path)

  codeEditor.focus()
}

const newFile = () => {
  filePath = null
  codeEditor.setValue('')
  appWindow.setTitle('Untitled')
}

const saveFile = async () => {
  if (filePath === null) {
    const saved = await save()

    if (saved) {
      console.log(saved)
      await writeTextFile(saved, codeEditor.getValue())
      filePath = saved
      appWindow.setTitle(saved)
    }

    return
  }

  await writeTextFile(filePath, codeEditor.getValue())

  appWindow.setTitle(filePath)
}

window.addEventListener('DOMContentLoaded', () => {
  const editorDom = document.getElementById('editor')!
  codeEditor = monaco.editor.create(editorDom, {
    automaticLayout: true,
    fontSize: 14,
    minimap: {
      enabled: false,
    },
    language: 'javascript',
    renderLineHighlight: 'none',
  })

  newFile()

  codeEditor.focus()

  codeEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveFile)

  codeEditor.onDidChangeModelContent(() => {
    codeEditor.getModel()?.onDidChangeContent(() => {
      appWindow.setTitle(`${filePath ?? 'Untitled'} *`)
    })
  })

  const languageDom = document.getElementById('language')!

  languageDom.addEventListener('change', (e) =>
    setLanguage((e.target as HTMLSelectElement).value as any)
  )

  const newDom = document.getElementById('new')!

  newDom.addEventListener('click', newFile)

  const openDom = document.getElementById('open')!

  openDom.addEventListener('click', async () => {
    const selectedFile = await open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: 'source',
          extensions: ['js', 'ts', 'html', 'css'],
        },
      ],
    })

    if (Array.isArray(selectedFile)) {
    } else if (selectedFile === null) {
      // user cancelled the selection
    } else {
      await openFile(selectedFile)
    }
  })

  const saveDom = document.getElementById('save')!

  saveDom.addEventListener('click', saveFile)
})
