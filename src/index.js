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
  constructor() {
    super();
    this.addClass('jp-scheduler-content');
    this.currentPath = '파일이 선택되지 않았습니다';
    this.commandInput = null;
    this.node.innerHTML = schedulerTemplate;
    this.initializeEventHandlers();
  }

  initializeEventHandlers() {
    this.commandInput = this.node.querySelector('#command');

    this.node.querySelectorAll('.group-header[data-action="toggle"]').forEach(header => {
      header.addEventListener('click', () => {
        header.classList.toggle('collapsed');
        header.nextElementSibling.classList.toggle('collapsed');
      });
    });

    this.node.querySelectorAll('input[name="envSet"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const envSelectors = this.node.querySelector('#envSelectors');
        envSelectors.style.display = e.target.value === 'custom' ? 'block' : 'none';
      });
    });

    this.initializeParameterHandlers();

    const submitBtn = this.node.querySelector('#submitBtn');
    submitBtn?.addEventListener('click', () => this.handleSubmit());
  }

  initializeParameterHandlers() {
    const addParamBtn = this.node.querySelector('#addParamBtn');
    const paramTableBody = this.node.querySelector('#paramTableBody');
    const paramKey = this.node.querySelector('#paramKey');
    const paramValue = this.node.querySelector('#paramValue');

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

  handleSubmit() {
    const requiredFields = {
      groupName: this.node.querySelector('#groupName'),
      taskName: this.node.querySelector('#taskName'),
      envType: this.node.querySelector('#envType'),
      envDetail: this.node.querySelector('#envDetail'),
      resourceType: this.node.querySelector('#resourceType'),
      resourceDetail: this.node.querySelector('#resourceDetail')
    };

    if (this.currentPath === '파일이 선택되지 않았습니다') {
      window.alert('필수 항목이 누락되었습니다. 다시 작성 후 생성해 주세요.');
      return;
    }

    for (const [_, field] of Object.entries(requiredFields)) {
      if (!field.value) {
        window.alert('필수 항목이 누락되었습니다. 다시 작성 후 생성해 주세요.');
        return;
      }
    }

    const formData = {
      groupName: requiredFields.groupName.value,
      taskName: requiredFields.taskName.value,
      taskDescription: this.node.querySelector('#taskDescription').value,
      envSet: this.node.querySelector('input[name="envSet"]:checked').value,
      envType: requiredFields.envType.value,
      envDetail: requiredFields.envDetail.value,
      resourceType: requiredFields.resourceType.value,
      resourceDetail: requiredFields.resourceDetail.value,
      parameters: Array.from(this.node.querySelector('#paramTableBody').querySelectorAll('tr')).map(row => ({
        key: row.cells[0].textContent,
        value: row.cells[1].textContent
      })),
      command: this.commandInput?.value || ''
    };

    console.log('Form submitted:', formData);
  }

  updateFilePath(path) {
    this.currentPath = path;
    const pathDisplay = this.node.querySelector('.current-path');
    if (pathDisplay) {
      pathDisplay.textContent = `현재 열린 파일: ${this.currentPath}`;
    }

    if (this.commandInput) {
      const isNotebook = path.endsWith('.ipynb');
      this.commandInput.disabled = isNotebook;
      this.commandInput.value = isNotebook ? 'Jupyter Notebook 파일은 실행 명령어를 지정할 수 없습니다.' : '';
    }
  }

  getCurrentPath() {
    return this.currentPath;
  }
}

class SchedulerWidget extends LuminoPanel {
  constructor() {
    super();
    this.addClass('jp-scheduler-widget');
    
    const layout = this.layout;
    this.content = new ContentWidget();
    layout.addWidget(this.content);
  }

  updateFilePath(path) {
    this.content.updateFilePath(path);
  }
}

class SchedulerPanel extends SidePanel {
  constructor() {
    super();
    this.addClass('jp-SchedulerPanel');
    this.title.icon = playIcon;
    this.title.caption = '스케줄러';
    this.id = 'scheduler-panel';

    this.widget = new SchedulerWidget();
    this.addWidget(this.widget);
  }

  updateFilePath(path) {
    this.widget.updateFilePath(path);
  }
}

const plugin = {
  id: 'scheduler-jupyter-extension:plugin',
  description: 'A JupyterLab extension for scheduling.',
  autoStart: true,
  requires: [ICommandPalette, ILabShell, IFileBrowserFactory],
  activate: (
    app,
    palette,
    labShell,
    fileBrowserFactory
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