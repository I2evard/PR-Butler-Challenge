import { TaskManager } from './taskManager'
import { loadTranslations, setLanguage } from './i18n'
import { TaskFilter } from './types'
import './styles.css'

// Deliberately poor code quality for PR Butler to fix
let taskManager: TaskManager

// Initialize app
async function init() {
  await loadTranslations()
  taskManager = new TaskManager()
  setupEventListeners()
  taskManager.render()
}

function setupEventListeners() {
  const form = document.getElementById('task-form') as HTMLFormElement
  const langEnBtn = document.getElementById('lang-en')
  const langFrBtn = document.getElementById('lang-fr')
  
  form?.addEventListener('submit', handleSubmit)
  langEnBtn?.addEventListener('click', () => switchLanguage('en'))
  langFrBtn?.addEventListener('click', () => switchLanguage('fr'))
  
  const filterBtns = document.querySelectorAll('.filter-btn')
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const filter = target.dataset.filter
      if (filter) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
        target.classList.add('active')
        taskManager.setFilter(filter as TaskFilter)
      }
    })
  })
}

// Poor formatting and style
function handleSubmit(e: Event){
e.preventDefault()
const input=document.getElementById('task-input') as HTMLInputElement
const select=document.getElementById('priority-select') as HTMLSelectElement
if(input.value.trim()){
taskManager.addTask(input.value,select.value as 'low'|'medium'|'high')
input.value=''
}
}

function switchLanguage(lang: string) {
  setLanguage(lang)
  
  document.querySelectorAll('.language-selector button').forEach(btn => {
    btn.classList.remove('active')
  })
  
  const activeBtn = document.getElementById(`lang-${lang}`)
  activeBtn?.classList.add('active')
  
  // Note: Translation application is missing - deliberate issue
}

// Missing error handling
init()
