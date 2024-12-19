import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { Widget } from '@lumino/widgets';

import { ICommandPalette, Dialog, showDialog } from '@jupyterlab/apputils';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { DocumentWidget } from '@jupyterlab/docregistry';
import { LabIcon, SidePanel } from '@jupyterlab/ui-components';

import { schedulerTemplate } from './templates/scheduler-create';
import '../style/index.css';

// API 설정
const API_CONFIG = {
  baseURL: 'http://localhost:3004',
  endpoints: {
    taskGroups: '/task-groups',
    resourceData: '/resource-data',
    createTask: '/tasks'
  }
};

// 아이콘 정의
const playIconStr = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
  <path d="M8 5v14l11-7z"/>
</svg>
`;
const playIcon = new LabIcon({ name: 'scheduler:play', svgstr: playIconStr });

// API 클래스 구현
class SchedulerAPI {
  constructor() {
    this.resourceData = null;
  }

  async fetchTaskGroups() {
    try {
      const response = await fetch(
        `${API_CONFIG.baseURL}${API_CONFIG.endpoints.taskGroups}`
      );
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch task groups:', error);
      return [{ id: '', name: '선택하세요' }];
    }
  }

  async fetchResourceData() {
    try {
      const response = await fetch(
        `${API_CONFIG.baseURL}${API_CONFIG.endpoints.resourceData}`
      );
      this.resourceData = await response.json();
      return this.resourceData;
    } catch (error) {
      console.error('Failed to fetch resource data:', error);
      return {
        environments: {
          predefined: { id: 'default', name: '기본 환경' },
          custom: {
            types: [],
            details: {}
          }
        },
        computeResources: {
          types: [
            { id: 'cpu', name: 'CPU' },
            { id: 'gpu', name: 'GPU/CPU' }
          ],
          details: {
            cpu: [],
            gpu: []
          }
        }
      };
    }
  }

  async createTask(taskData) {
    const response = await fetch(
      `${API_CONFIG.baseURL}${API_CONFIG.endpoints.createTask}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '작업 생성에 실패했습니다.');
    }

    return response.json();
  }

  validateForm(formData) {
    const requiredFields = {
      groupName: '작업 그룹명',
      taskName: '작업명',
      selectedFile: '실행 파일',
      resourceType: '자원 종류',
      resourceDetail: '세부 자원'
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!formData[field]) {
        return `${label}을(를) 입력해주세요.`;
      }
    }

    if (formData.envSet === 'custom') {
      if (!formData.envType || !formData.envDetail) {
        return '개발환경을 선택해주세요.';
      }
    }

    return null;
  }

  getEnvironmentDetails(typeId) {
    return this.resourceData?.environments?.custom?.details[typeId] || [];
  }

  getResourceDetails(typeId) {
    return this.resourceData?.computeResources?.details[typeId] || [];
  }
}

class ContentWidget extends Widget {
  constructor(app) {
    super();
    this.api = new SchedulerAPI();
    this.app = app;
    this.commandInput = null;
    this.currentPath = '파일이 선택되지 않았습니다';
    this.parameters = new Map();
    this.savedState = null; // 상태 저장을 위한 변수 추가

    this.addClass('jp-scheduler-content');
    this.node.innerHTML = schedulerTemplate;
    this.initializeContent();
    this.initializeEventHandlers();
  }

  async initializeContent() {
    const taskGroups = await this.api.fetchTaskGroups();
    const groupSelect = this.node.querySelector('#groupName');
    if (groupSelect) {
      groupSelect.innerHTML = '<option value="">선택하세요</option>';
      taskGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        groupSelect.appendChild(option);
      });
    }

    const resourceData = await this.api.fetchResourceData();
    this.updateResourceOptions(resourceData);
  }

  initializeEventHandlers() {
    this.commandInput = this.node.querySelector('#command');

    const fileSelectBtn = this.node.querySelector('#fileSelectBtn');
    fileSelectBtn?.addEventListener('click', () => {
      this.app.commands.execute('filebrowser:activate');
    });

    this.node
      .querySelectorAll('.group-header[data-action="toggle"]')
      .forEach(header => {
        header.addEventListener('click', () => {
          header.classList.toggle('collapsed');
          header.nextElementSibling?.classList.toggle('collapsed');
        });
      });

    this.node.querySelectorAll('input[name="envSet"]').forEach(radio => {
      radio.addEventListener('change', e => {
        const envSelectors = this.node.querySelector('#envSelectors');
        if (envSelectors) {
          envSelectors.style.display =
            e.target.value === 'custom' ? 'block' : 'none';
        }
      });
    });

    const envTypeSelect = this.node.querySelector('#envType');
    envTypeSelect?.addEventListener('change', e => {
      this.updateEnvDetailOptions(e.target.value);
    });

    const resourceTypeSelect = this.node.querySelector('#resourceType');
    resourceTypeSelect?.addEventListener('change', e => {
      this.updateResourceDetailOptions(e.target.value);
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
        const currentCommand = this.commandInput.value;

        // 파라미터 시작과 끝 위치 찾기
        const segments = [];
        let paramStart = -1;
        let paramEnd = -1;
        let inParam = false;

        // 현재 명령어를 순회하면서 파라미터 영역 찾기
        for (let i = 0; i < currentCommand.length; i++) {
          if (currentCommand.startsWith('--', i)) {
            if (!inParam) {
              if (paramStart === -1) {
                paramStart = i;
              }
              inParam = true;
            }
          } else if (inParam && currentCommand[i] === ' ') {
            inParam = false;
            paramEnd = i;
          }
        }
        if (inParam) {
          paramEnd = currentCommand.length;
        }

        // 명령어를 세 부분으로 나누기: 앞부분, 파라미터 부분, 뒷부분
        let prefix = '';
        let suffix = '';

        if (paramStart !== -1) {
          prefix = currentCommand.substring(0, paramStart).trim();
          suffix = currentCommand.substring(paramEnd).trim();
        } else {
          prefix = currentCommand.trim();
        }

        // 현재 파라미터들로 새로운 파라미터 문자열 생성
        const paramCommands = Array.from(this.parameters.entries())
          .map(([key, value]) => `--${key}=${value}`)
          .join(' ');

        // 세 부분 다시 조합
        let newCommand = prefix;
        if (paramCommands) {
          newCommand = newCommand
            ? `${newCommand} ${paramCommands}`
            : paramCommands;
        }
        if (suffix) {
          newCommand = `${newCommand} ${suffix}`;
        }

        this.commandInput.value = newCommand;
      }
    };

    addParamBtn?.addEventListener('click', async () => {
      if (paramKey.value) {
        const key = paramKey.value.trim();

        if (this.parameters.has(key)) {
          await showDialog({
            title: '파라미터 오류',
            body: '이미 존재하는 파라미터 키입니다.',
            buttons: [Dialog.okButton()]
          });
          return;
        }

        this.parameters.set(key, paramValue.value.trim());

        if (paramTableBody) {
          const row = paramTableBody.insertRow();
          row.innerHTML = `
            <td>${key}</td>
            <td>
              <input type="text" class="param-value-input" value="${paramValue.value.trim()}" />
            </td>
            <td class="param-row-action">
              <button class="btn btn-small btn-danger">삭제</button>
            </td>
          `;

          // 값 수정 이벤트 처리
          const valueInput = row.querySelector('.param-value-input');
          valueInput?.addEventListener('change', e => {
            this.parameters.set(key, e.target.value.trim());
            updateCommand();
          });

          const deleteBtn = row.querySelector('.btn-danger');
          deleteBtn?.addEventListener('click', () => {
            this.parameters.delete(key);
            row.remove();
            updateCommand();
          });
        }

        paramKey.value = '';
        paramValue.value = '';
        updateCommand();
      }
    });
  }

  updateResourceOptions(data) {
    const resourceTypeSelect = this.node.querySelector('#resourceType');
    if (resourceTypeSelect) {
      resourceTypeSelect.innerHTML = '<option value="">자원 종류</option>';
      data.computeResources.types.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        resourceTypeSelect.appendChild(option);
      });
    }

    const envTypeSelect = this.node.querySelector('#envType');
    if (envTypeSelect) {
      envTypeSelect.innerHTML = '<option value="">환경 선택</option>';
      data.environments.custom.types.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        envTypeSelect.appendChild(option);
      });
    }
  }

  updateEnvDetailOptions(typeId) {
    const details = this.api.getEnvironmentDetails(typeId);
    const envDetailSelect = this.node.querySelector('#envDetail');
    if (envDetailSelect) {
      envDetailSelect.innerHTML = '<option value="">세부 내용 선택</option>';
      details.forEach(detail => {
        const option = document.createElement('option');
        option.value = detail.id;
        option.textContent = detail.name;
        envDetailSelect.appendChild(option);
      });
    }
  }

  updateResourceDetailOptions(typeId) {
    const details = this.api.getResourceDetails(typeId);
    const resourceDetailSelect = this.node.querySelector('#resourceDetail');
    if (resourceDetailSelect) {
      resourceDetailSelect.innerHTML = '<option value="">세부 자원</option>';
      details.forEach(detail => {
        const option = document.createElement('option');
        option.value = detail.id;
        option.textContent = detail.name;
        resourceDetailSelect.appendChild(option);
      });
    }
  }

  async handleSubmit() {
    const formData = {
      groupName: this.node.querySelector('#groupName').value,
      taskName: this.node.querySelector('#taskName').value,
      taskDescription: this.node.querySelector('#taskDescription').value,
      selectedFile: this.currentPath,
      envSet: this.node.querySelector('input[name="envSet"]:checked').value,
      envType: this.node.querySelector('#envType').value,
      envDetail: this.node.querySelector('#envDetail').value,
      resourceType: this.node.querySelector('#resourceType').value,
      resourceDetail: this.node.querySelector('#resourceDetail').value,
      parameters: Array.from(this.parameters.entries()).map(([key, value]) => ({
        key,
        value
      })),
      command: this.node.querySelector('#command').value
    };

    const validationError = this.api.validateForm(formData);

    if (validationError) {
      await showDialog({
        title: '입력 오류',
        body: validationError,
        buttons: [Dialog.okButton()]
      });
      return;
    }

    try {
      await this.api.createTask(formData);
      await showDialog({
        title: '성공',
        body: '작업이 성공적으로 등록되었습니다.',
        buttons: [Dialog.okButton()]
      });
      this.resetForm();
    } catch (error) {
      await showDialog({
        title: '오류',
        body: error.message || '작업 등록에 실패했습니다.',
        buttons: [Dialog.okButton()]
      });
    }
  }

  resetForm() {
    const elements = {
      taskName: '',
      taskDescription: '',
      groupName: '',
      resourceType: '',
      resourceDetail: '',
      command: '',
      envType: '',
      envDetail: ''
    };

    for (const [id, value] of Object.entries(elements)) {
      const element = this.node.querySelector(`#${id}`);
      if (element) {
        element.value = value;
      }
    }

    const paramTableBody = this.node.querySelector('#paramTableBody');
    if (paramTableBody) {
      paramTableBody.innerHTML = '';
    }
    this.parameters.clear();

    const predefinedRadio = this.node.querySelector(
      'input[name="envSet"][value="predefined"]'
    );
    if (predefinedRadio) {
      predefinedRadio.checked = true;
    }

    const envSelectors = this.node.querySelector('#envSelectors');
    if (envSelectors) {
      envSelectors.style.display = 'none';
    }
  }

  updateFilePath(path) {
    this.currentPath = path;
    const pathDisplay = this.node.querySelector('.current-path');
    const paramSection = this.node.querySelector('.param-section');
    const commandSection = this.node.querySelector('.command-section');

    if (pathDisplay) {
      pathDisplay.textContent = `현재 열린 파일: ${this.currentPath}`;
    }

    const isNotebook = path.endsWith('.ipynb');

    if (isNotebook) {
      // 노트북 파일일 때: 현재 상태 저장 후 숨기기
      if (!this.savedState) {
        this.savedState = {
          parameters: new Map(this.parameters),
          command: this.commandInput?.value || ''
        };
      }

      // 파라미터와 명령어 섹션 숨기기
      if (paramSection) paramSection.style.display = 'none';
      if (commandSection) commandSection.style.display = 'none';

      // 값 초기화
      this.parameters.clear();
      if (this.commandInput) {
        this.commandInput.value = '';
      }
      this.updateParamTable();
    } else {
      // 일반 파일일 때: 저장된 상태 복원
      if (paramSection) paramSection.style.display = 'block';
      if (commandSection) commandSection.style.display = 'block';

      if (this.savedState) {
        // 저장된 상태 복원
        this.parameters = new Map(this.savedState.parameters);
        if (this.commandInput) {
          this.commandInput.value = this.savedState.command;
        }
        this.updateParamTable();
        this.savedState = null; // 복원 후 저장된 상태 초기화
      }
    }
  }

  updateParamTable() {
    const paramTableBody = this.node.querySelector('#paramTableBody');
    if (paramTableBody) {
      paramTableBody.innerHTML = '';

      this.parameters.forEach((value, key) => {
        const row = paramTableBody.insertRow();
        row.innerHTML = `
          <td>${key}</td>
          <td>
            <input type="text" class="param-value-input" value="${value}" />
          </td>
          <td class="param-row-action">
            <button class="btn btn-small btn-danger">삭제</button>
          </td>
        `;

        // 값 수정 이벤트 처리
        const valueInput = row.querySelector('.param-value-input');
        valueInput?.addEventListener('change', e => {
          this.parameters.set(key, e.target.value.trim());
          this.updateCommand();
        });

        // 삭제 버튼 이벤트 처리
        const deleteBtn = row.querySelector('.btn-danger');
        deleteBtn?.addEventListener('click', () => {
          this.parameters.delete(key);
          row.remove();
          this.updateCommand();
        });
      });
    }
  }

  getCurrentPath() {
    return this.currentPath;
  }
}

class SchedulerWidget extends Widget {
  constructor(app) {
    super();
    this.addClass('jp-scheduler-widget');
    this.id = 'scheduler-widget';

    this.content = new ContentWidget(app);
    this.node.appendChild(this.content.node);
  }

  updateFilePath(path) {
    this.content.updateFilePath(path);
  }
}

class SchedulerStatusWidget extends Widget {
  constructor(app) {
    super();
    this.addClass('jp-scheduler-new-widget');
    this.id = 'scheduler-new-widget';
    this.title.label = '스케줄러 이력';

    // 새로운 위젯의 내용
    this.node.innerHTML = `
      <div class="jp-scheduler-new-content">
      <h2>스케줄러 이력 내용</h2>
      </div>
    `;
  }
}

class SchedulerPanel extends SidePanel {
  constructor(app) {
    super();
    this.addClass('jp-SchedulerPanel');
    this.title.icon = playIcon;
    this.title.caption = '스케줄러';
    this.id = 'scheduler-panel';

    this.widget = new SchedulerWidget(app);
    this.widget.title.label = '스케줄러 등록';

    this.schedulerStatusWidget = new SchedulerStatusWidget(app);

    this.addWidget(this.widget);
    this.addWidget(this.schedulerStatusWidget);
  }

  updateFilePath(path) {
    this.widget.updateFilePath(path);
  }
}

const plugin = {
  id: 'scheduler-jupyter-extension:plugin',
  description: 'A JupyterLab extension for scheduling.',
  autoStart: true,
  requires: [ICommandPalette, IFileBrowserFactory],
  activate: (app, palette, fileBrowser) => {
    console.log(
      'JupyterLab extension scheduler-jupyter-extension is activated!'
    );

    const panel = new SchedulerPanel(app);

    const command = 'scheduler:toggle';
    app.commands.addCommand(command, {
      label: 'Toggle Scheduler',
      icon: playIcon,
      execute: () => {
        if (!panel.isAttached) {
          app.shell.add(panel, 'left');
        }
        app.shell.activateById(panel.id);
      }
    });

    palette.addItem({
      command,
      category: 'Scheduler'
    });

    app.shell.add(panel, 'left', { rank: 200 });

    // 툴바 버튼 생성
    const toolbarButton = new Widget();
    toolbarButton.id = 'scheduler-toolbar-button';
    toolbarButton.addClass('jp-ToolbarButton');
    toolbarButton.hide();

    const button = document.createElement('button');
    button.className = 'jp-ToolbarButtonComponent';
    button.onclick = () => {
      app.commands.execute(command);
    };

    const icon = document.createElement('div');
    playIcon.element({
      container: icon,
      tag: 'span',
      elementPosition: 'center'
    });

    button.appendChild(icon);
    toolbarButton.node.appendChild(button);
    app.shell.add(toolbarButton, 'top', { rank: 1000 });

    // 현재 파일에 따른 버튼 가시성 업데이트
    const updateButtonVisibility = widget => {
      if (widget instanceof DocumentWidget) {
        const path = widget.context.path;
        const isValidFile = path.endsWith('.py') || path.endsWith('.ipynb');
        if (isValidFile) {
          toolbarButton.show();
        } else {
          toolbarButton.hide();
        }
        if (path) {
          panel.updateFilePath(path);
        }
      } else {
        toolbarButton.hide();
      }
    };

    // 활성 위젯 변경 이벤트 리스너
    app.shell.currentChanged.connect((_, change) => {
      updateButtonVisibility(change.newValue);
    });
  }
};

export default plugin;
