import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabShell
} from '@jupyterlab/application';

import { 
  Widget,
  Panel as LuminoPanel,
  PanelLayout
} from '@lumino/widgets';

import { 
  ICommandPalette,
} from '@jupyterlab/apputils';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { DocumentWidget } from '@jupyterlab/docregistry';
import { 
  LabIcon,
  SidePanel
} from '@jupyterlab/ui-components';

import { schedulerTemplate } from './templates/scheduler-create';
import '../style/index.css';

const playIconStr = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
  <path d="M8 5v14l11-7z"/>
</svg>
`;
const playIcon = new LabIcon({ name: 'scheduler:play', svgstr: playIconStr });

class ContentWidget extends Widget {
  private currentPath: string = '파일이 선택되지 않았습니다';
  private commandInput: HTMLInputElement | null = null;

  constructor() {
    super();
    this.addClass('jp-scheduler-content');
    this.node.innerHTML = schedulerTemplate;
    this.initializeEventHandlers();
  }

  private initializeEventHandlers() {
    // Store command input reference
    this.commandInput = this.node.querySelector('#command');

    // 그룹 토글 기능
    this.node.querySelectorAll('.group-header[data-action="toggle"]').forEach(header => {
      header.addEventListener('click', () => {
        header.classList.toggle('collapsed');
        (header.nextElementSibling as HTMLElement).classList.toggle('collapsed');
      });
    });

    // 환경 선택 라디오 버튼
    this.node.querySelectorAll('input[name="envSet"]').forEach(radio => {
      radio.addEventListener('change', (e: Event) => {
        const envSelectors = this.node.querySelector('#envSelectors') as HTMLElement;
        envSelectors.style.display = (e.target as HTMLInputElement).value === 'custom' ? 'block' : 'none';
      });
    });

    // 파라미터 추가 기능
    this.initializeParameterHandlers();

    // 제출 기능
    const submitBtn = this.node.querySelector('#submitBtn');
    submitBtn?.addEventListener('click', () => this.handleSubmit());
  }

  private initializeParameterHandlers() {
    const addParamBtn = this.node.querySelector('#addParamBtn');
    const paramTableBody = this.node.querySelector('#paramTableBody') as HTMLTableSectionElement;
    const paramKey = this.node.querySelector('#paramKey') as HTMLInputElement;
    const paramValue = this.node.querySelector('#paramValue') as HTMLInputElement;

    const updateCommand = () => {
      if (this.commandInput && !this.commandInput.disabled) {
        const params = Array.from(paramTableBody.querySelectorAll('tr')).map(row => {
          const key = row.cells[0].textContent;
          const value = row.cells[1].textContent;
          return `--${key}=${value}`;
        });
        this.commandInput.value = params.join(' ');
      }
    };

    addParamBtn?.addEventListener('click', () => {
      if (paramKey.value) {
        const row = paramTableBody.insertRow();
        row.innerHTML = `
          <td>${paramKey.value}</td>
          <td>${paramValue.value}</td>
          <td class="param-row-action">
            <button class="btn btn-small btn-danger">삭제</button>
          </td>
        `;

        const deleteBtn = row.querySelector('.btn-danger');
        deleteBtn?.addEventListener('click', () => {
          row.remove();
          updateCommand();
        });

        paramKey.value = '';
        paramValue.value = '';
        updateCommand();
      }
    });
  }

  private handleSubmit() {
    const requiredFields = {
      groupName: this.node.querySelector('#groupName') as HTMLSelectElement,
      taskName: this.node.querySelector('#taskName') as HTMLInputElement,
      envType: this.node.querySelector('#envType') as HTMLSelectElement,
      envDetail: this.node.querySelector('#envDetail') as HTMLSelectElement,
      resourceType: this.node.querySelector('#resourceType') as HTMLSelectElement,
      resourceDetail: this.node.querySelector('#resourceDetail') as HTMLSelectElement
    };

    // Check if current path is selected
    if (this.currentPath === '파일이 선택되지 않았습니다') {
      window.alert('필수 항목이 누락되었습니다. 다시 작성 후 생성해 주세요.');
      return;
    }

    // Check all required fields
    for (const [_, field] of Object.entries(requiredFields)) {
      if (!field.value) {
        window.alert('필수 항목이 누락되었습니다. 다시 작성 후 생성해 주세요.');
        return;
      }
    }

    // If all validations pass, collect and submit form data
    const formData = {
      groupName: requiredFields.groupName.value,
      taskName: requiredFields.taskName.value,
      taskDescription: (this.node.querySelector('#taskDescription') as HTMLTextAreaElement).value,
      envSet: (this.node.querySelector('input[name="envSet"]:checked') as HTMLInputElement).value,
      envType: requiredFields.envType.value,
      envDetail: requiredFields.envDetail.value,
      resourceType: requiredFields.resourceType.value,
      resourceDetail: requiredFields.resourceDetail.value,
      parameters: Array.from((this.node.querySelector('#paramTableBody') as HTMLTableElement).querySelectorAll('tr')).map(row => ({
        key: row.cells[0].textContent,
        value: row.cells[1].textContent
      })),
      command: this.commandInput?.value || ''
    };

    console.log('Form submitted:', formData);
  }

  updateFilePath(path: string) {
    this.currentPath = path;
    const pathDisplay = this.node.querySelector('.current-path');
    if (pathDisplay) {
      pathDisplay.textContent = `현재 열린 파일: ${this.currentPath}`;
    }

    // Disable command input for .ipynb files
    if (this.commandInput) {
      const isNotebook = path.endsWith('.ipynb');
      this.commandInput.disabled = isNotebook;
      this.commandInput.value = isNotebook ? 'Jupyter Notebook 파일은 실행 명령어를 지정할 수 없습니다.' : '';
    }
  }

  getCurrentPath(): string {
    return this.currentPath;
  }
}

class SchedulerWidget extends LuminoPanel {
  private content: ContentWidget;

  constructor() {
    super();
    this.addClass('jp-scheduler-widget');
    
    const layout = this.layout as PanelLayout;
    this.content = new ContentWidget();
    layout.addWidget(this.content);
  }

  updateFilePath(path: string) {
    this.content.updateFilePath(path);
  }
}

class SchedulerPanel extends SidePanel {
  private widget: SchedulerWidget;

  constructor() {
    super();
    this.addClass('jp-SchedulerPanel');
    this.title.icon = playIcon;
    this.title.caption = '스케줄러';
    this.id = 'scheduler-panel';

    this.widget = new SchedulerWidget();
    this.addWidget(this.widget);
  }

  updateFilePath(path: string) {
    this.widget.updateFilePath(path);
  }
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'scheduler-jupyter-extension:plugin',
  description: 'A JupyterLab extension for scheduling.',
  autoStart: true,
  requires: [ICommandPalette, ILabShell, IFileBrowserFactory],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    labShell: ILabShell,
    fileBrowserFactory: IFileBrowserFactory
  ) => {
    console.log('JupyterLab extension scheduler-jupyter-extension is activated!');

    const panel = new SchedulerPanel();

    const command = 'scheduler:toggle';
    app.commands.addCommand(command, {
      label: 'Toggle Scheduler',
      icon: playIcon,
      execute: () => {
        if (!panel.isAttached) {
          labShell.add(panel, 'left');
        }
        labShell.activateById(panel.id);
      }
    });

    palette.addItem({
      command,
      category: 'Scheduler'
    });

    labShell.add(panel, 'left', { rank: 200 });

    const toolbarButton = new Widget();
    toolbarButton.id = 'scheduler-toolbar-button';
    toolbarButton.addClass('jp-ToolbarButton');
    
    const button = document.createElement('button');
    button.className = 'jp-ToolbarButtonComponent';
    button.onclick = () => {
      app.commands.execute(command);
    };
    
    const icon = document.createElement('div');
    playIcon.element({
      container: icon,
      tag: 'span',
      elementPosition: 'center',
    });
    
    button.appendChild(icon);
    toolbarButton.node.appendChild(button);
    app.shell.add(toolbarButton, 'top', { rank: 1000 });

    labShell.currentChanged.connect((_, change) => {
      const widget = change.newValue;
      if (widget instanceof DocumentWidget) {
        const path = widget.context.path;
        if (path) {
          panel.updateFilePath(path);
        }
      }
    });
  }
};

export default plugin;