import { editor, KeyCode, KeyMod } from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { open, save, message } from '@tauri-apps/api/dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/api/fs'

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

let codeEditor: editor.IStandaloneCodeEditor
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

  const newModel = editor.createModel(codeEditor.getValue(), convertedLanguage)

  codeEditor.setModel(newModel)
}

const newFile = () => {
  filePath = null
  codeEditor.setValue('')
}

const saveFile = async () => {
  if (filePath === null) {
    const saved = await save()

    if (saved) {
      console.log(saved)
      await writeTextFile(saved, codeEditor.getValue())
      filePath = saved
    }

    return
  }

  await writeTextFile(filePath, codeEditor.getValue())

  await message('Saved')
}

window.addEventListener('DOMContentLoaded', () => {
  const editorDom = document.getElementById('editor')!
  codeEditor = editor.create(editorDom, {
    automaticLayout: true,
    fontSize: 14,
    minimap: {
      enabled: false,
    },
    language: 'javascript',
    renderLineHighlight: 'none',
  })

  codeEditor.focus()

  codeEditor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, saveFile)

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
      // user selected a single file
      console.log(selectedFile)

      filePath = selectedFile

      const extension = selectedFile.split('.').pop()
      const file = await readTextFile(selectedFile)

      setLanguage(extension as any)
      codeEditor.setValue(file)
    }
  })

  const saveDom = document.getElementById('save')!

  saveDom.addEventListener('click', saveFile)
})
