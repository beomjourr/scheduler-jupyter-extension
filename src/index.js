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
import { schedulerStatusTemplate } from './templates/scheduler-status';
import '../style/index.css';

import axios from 'axios';
import { mockResponse } from './mockData';

// API 설정
const API_CONFIG = {
  baseURL: 'https://api.namu.dev.samsungdisplay.net:32443',
  computeResourcesBaseURL: 'http://localhost:3004',
  endpoints: {
    taskGroups: '/extension/scheduler/experiments/users/${userId}',
    images: '/extension/images/users/${userId}',
    computeResources: '/resources',
    createTask: '/tasks',
    tasks: '/scheduler/runs/users/${userId}',
    notebookDetail: '/extension/notebooks/${notebookId}/detail'
  }
};

// SSL 인증서 검증 비활성화 (전역 설정)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


// API 클래스 구현
class SchedulerAPI {
  constructor() {
    this.imageData = null;
    this.computeResourceData = null;
    this.userId = this.getUserId();
  }

  getUserId() {
    console.log('process.env', process.env);
    if (process.env.userId) {
      return process.env.userId;
    }
    return "user123"
  }

  getUrlWithUserId(endpoint) {
    return endpoint.replace('${userId}', this.userId);
  }

  getResourceDetailsList(typeId) {
    return this.computeResourceData?.details?.[typeId] || [];
  }

  // Resource 관련 메서드
  getResourceDetails(typeId, resourceId) {
    if (!this.computeResourceData?.details?.[typeId]) return null;
    return this.computeResourceData.details[typeId].find(detail => detail.name === resourceId);
  }


  setResourceInfo(formData, resourceType, resourceDetail) {
    if (!this.computeResourceData?.details?.[resourceType]) return formData;
    
    const resourceInfo = this.computeResourceData.details[resourceType].find(
      detail => detail.name === resourceDetail
    );

    if (resourceInfo) {
      return {
        ...formData,
        resourceCpu: resourceInfo.cpu,
        resourceMemory: resourceInfo.memory,
        resourceGpu: resourceInfo.gpu,
        resourceGpuType: resourceInfo.gpuType || "",
        resourceName: resourceInfo.name
      };
    }
    return formData;
  }

  getImageDetails(imageId) {
    if (!this.imageData?.images) return null;
    return this.imageData.images.find(img => img.id === imageId);
  }

  setImageInfo(formData, envSet, envDetailValue, notebookEnvData) {
    if (envSet === "predefined" && notebookEnvData?.image) {
      formData.imageName = notebookEnvData.image.name;
      formData.isSharedAsset = notebookEnvData.image.isPublic || false;
    } else {
      const imageInfo = this.getImageDetails(envDetailValue);
      if (imageInfo) {
        formData.imageName = imageInfo.name;
        formData.isSharedAsset = imageInfo.isPublic || false;
      }
    }
    return formData;
  }

  async fetchTaskGroups() {
    try {
      const endpoint = this.getUrlWithUserId(API_CONFIG.endpoints.taskGroups);
      const response = await axios.get(`${API_CONFIG.baseURL}${endpoint}`);
      console.log('fetchTaskGroups', response.data.data.data);
      return response.data.data.data;
    } catch (error) {
      console.error('Failed to fetch task groups:', error);
      return [];
    }
  }

  async fetchImageData() {
    try {
      const endpoint = this.getUrlWithUserId(API_CONFIG.endpoints.images);
      const response = await axios.get(`${API_CONFIG.baseURL}${endpoint}`);
      console.log('fetchImageData', response.data.data);
      this.imageData = response.data.data;  // 클래스 변수에 저장
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch image data:', error);
      return {
        images: [],
      };
    }
  }

  async fetchComputeResourceData() {
    try {
      // const response = await axios.get(
      //   `${API_CONFIG.computeResourcesBaseURL}${API_CONFIG.endpoints.computeResources}`
      // );

      const response = mockResponse;
      
      const resourceItems = response.data[0]?.children?.[0]?.children?.[0]?.children || [];
      const cpuOnlyResources = [];
      const cpuGpuResources = [];
  
      resourceItems.forEach((item) => {
        const resourceValues = this.extractResourceValues(item.contents.codeValue);
        const resourceItem = {
          name: item.contents.messageDefault,
          cpu: resourceValues.cpu,
          memory: resourceValues.memory,
          gpu: resourceValues.gpu,
          gpuType: "",
        };
  
        if (parseInt(resourceValues.gpu) > 0) {
          cpuGpuResources.push(resourceItem);
        } else {
          cpuOnlyResources.push(resourceItem);
        }
      });
  
      const formattedData = {
        types: [
          { id: "cpu", name: "CPU" },
          { id: "cpu_gpu", name: "CPU/GPU" },
        ],
        details: {
          cpu: cpuOnlyResources,
          cpu_gpu: cpuGpuResources,
        }
      };
  
      this.computeResourceData = formattedData;
      return formattedData;
    } catch (error) {
      console.error('Failed to fetch compute resource data:', error);
      return {
        types: [],
        details: {},
      };
    }
  }

  async fetchNotebookDetail(notebookId) {
    try {
      const endpoint = API_CONFIG.endpoints.notebookDetail.replace('${notebookId}', notebookId);
      const response = await axios.get(`${API_CONFIG.baseURL}${endpoint}`);
      console.log('fetchNotebookDetail', response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch notebook detail:', error);
      return null;
    }
  }

  async fetchTasks(fromDate, toDate) {
    try {
      const endpoint = this.getUrlWithUserId(
        `${API_CONFIG.endpoints.tasks}?fromDate=${fromDate}&toDate=${toDate}`
      );
      const response = await axios.get(`${API_CONFIG.baseURL}${endpoint}`);
      return response.data.data.data;
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      return [];
    }
  }

  async createTask(taskData) {
    try {
      const enrichedTaskData = {
        ...taskData,
        createUserId: this.getUserId(),
        namespace: taskData.namespace || "",
        type: "instant",
        userPath: ""
      };

      const endpoint = this.getUrlWithUserId(API_CONFIG.endpoints.createTask);
      console.log('taskData', enrichedTaskData);
      const response = await axios.post(`${API_CONFIG.baseURL}${endpoint}`, enrichedTaskData);

      if (!response.data) {
        throw new Error('작업 생성에 실패했습니다.');
      }

      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || '작업 생성에 실패했습니다.');
    }
  }

  // 초기화 메서드
  async initializeData() {
    try {
      const [taskGroups, imageData, computeResourceData] =
        await Promise.all([
          this.fetchTaskGroups(),
          this.fetchImageData(),
          this.fetchComputeResourceData(),
        ]);

      return {
        taskGroups,
        imageData,
        computeResourceData,
      };
    } catch (error) {
      console.error('Failed to initialize data:', error);
      return {
        taskGroups: [],
        imageData: { images: [] },
        computeResourceData: { types: [], details: {} },
      };
    }
  }

  // Utility 메서드
  extractResourceValues(codeValue) {
    try {
      const cpuMatch = codeValue.match(/"cpu":(\d+)/);
      const gpuMatch = codeValue.match(/"gpu":(\d+)/);
      const memMatch = codeValue.match(/"mem":(\d+)/);

      return {
        cpu: cpuMatch ? cpuMatch[1] : '0',
        gpu: gpuMatch ? gpuMatch[1] : '0',
        memory: memMatch ? memMatch[1] : '0',
      };
    } catch (error) {
      console.error('Failed to extract resource values:', error);
      return { cpu: '0', gpu: '0', memory: '0' };
    }
  }

  extractNotebookId() {
    try {
      if (process.env.NB_PREFIX) {
        const nbPrefix = process.env.NB_PREFIX;
        if (nbPrefix) {
          const lastPart = nbPrefix.split("/").pop() || "";
          const notebookId = lastPart.match(/\d+/)[0];
          console.log("notebookId", notebookId);
          return notebookId;
        }
      }
      return null;
    } catch (error) {
      console.error("Error extracting notebook ID:", error);
      return null;
    }
  }

  validateForm(formData) {
    const requiredFields = {
      name: '작업명',
      outputPath: '실행 파일',
      imageName: '개발환경세트',
      resourceName: '연산 필요 자원',
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!formData[field]) {
        return `${label}을(를) 입력해주세요.`;
      }
    }

    return null;
  }
}

const defaultData = {
  name: "",
  description: "",
  experimentId: "",
  outputPath: "",
  imageName: "",
  isSharedAsset: false,
  createUserId: "",
  resourceGpuType: "",
  resourceCpu: "",
  resourceMemory: "",
  resourceName: "",
  resourceGpu: "",
  namespace: "",
  type: "instant",
  userPath: "",
  executionCommand: "",
  envSet: "predefined",
  envType: "",
  envDetail: "",
  resourceType: "",
  resourceDetail: "",
  runParameters: []
};

class ContentWidget extends Widget {
  constructor(app) {
    super();
    this.addClass('jp-scheduler-content');
    this.api = new SchedulerAPI();
    this.app = app;
    this.currentPath = '파일이 선택되지 않았습니다';
    this.parameters = new Map();
    this.formData = { ...defaultData };
    this.notebookEnvData = null;

    this.node.innerHTML = schedulerTemplate;
    this.commandInput = this.node.querySelector('#command');
    
    this.initializeContent();
    this.initializeEventHandlers();
  }

  async initializeContent() {
    try {
      const { taskGroups, imageData, computeResourceData } = 
        await this.api.initializeData();
  
      this.updateTaskGroups(taskGroups);
      this.updateResourceOptions(computeResourceData);
  
      const notebookId = this.api.extractNotebookId();
      console.log("notebookId", notebookId);

      if (notebookId) {
        try {
          const notebookDetail = await this.api.fetchNotebookDetail(notebookId);
          if (notebookDetail?.notebook) {
            this.updateNotebookData(notebookDetail);
          }
        } catch (error) {
          console.error('Error updating notebook data:', error);
        }
      }

      const envSelectors = this.node.querySelector('#envSelectors');
      if (envSelectors) {
        envSelectors.style.display = 'none';
      }

      try {
        this.restoreFormData();
      } catch (error) {
        console.error('Error restoring form data:', error);
        this.formData = { ...defaultData };
      }
    } catch (error) {
      console.error('Error initializing content:', error);
      this.formData = { ...defaultData };
    }
  }

  initializeEventHandlers() {
    // 파일 선택 버튼
    const fileSelectBtn = this.node.querySelector('#fileSelectBtn');
    fileSelectBtn?.addEventListener('click', () => {
      this.app.commands.execute('filebrowser:activate');
    });

    // 그룹 헤더 토글
    this.node
      .querySelectorAll('.group-header[data-action="toggle"]')
      .forEach(header => {
        header.addEventListener('click', () => {
          header.classList.toggle('collapsed');
          header.nextElementSibling?.classList.toggle('collapsed');
        });
      });

    // 환경 설정 라디오 버튼
    this.node.querySelectorAll('input[name="envSet"]').forEach(radio => {
      radio.addEventListener('change', e => {
        const envSelectors = this.node.querySelector('#envSelectors');
        const envType = this.node.querySelector('#envType');
        const envDetail = this.node.querySelector('#envDetail');
        
        if (e.target.value === 'custom') {
          if (envSelectors) envSelectors.style.display = 'block';
          if (envType) envType.style.display = 'block';
          if (envDetail) envDetail.style.display = 'block';
        } else {
          if (envSelectors) envSelectors.style.display = 'none';
          if (envType) envType.style.display = 'none';
          if (envDetail) envDetail.style.display = 'none';
        }
        
        this.formData.envSet = e.target.value;
      });
    });

    // 드롭다운 이벤트
    const envTypeSelect = this.node.querySelector('#envType');
    envTypeSelect?.addEventListener('change', e => {
      this.updateEnvDetailOptions(e.target.value);
      this.formData.envType = e.target.value;
    });

    const resourceTypeSelect = this.node.querySelector('#resourceType');
    if (resourceTypeSelect) {
      resourceTypeSelect.addEventListener('change', e => {
        const selectedType = e.target.value;
        console.log('Resource type changed:', selectedType);
        
        if (selectedType) {
          this.updateResourceDetailOptions(selectedType);
          this.formData.resourceType = selectedType;
        }
      });
    }

    // 파라미터 관련 이벤트
    this.initializeParameterHandlers();

    // 제출 버튼
    const submitBtn = this.node.querySelector('#submitBtn');
    submitBtn?.addEventListener('click', () => this.handleSubmit());

    // 폼 필드 변경 이벤트
    this.initializeFormFieldHandlers();
  }

  initializeFormFieldHandlers() {
    ['taskName', 'taskDescription'].forEach(id => {
      const element = this.node.querySelector(`#${id}`);
      element?.addEventListener('change', e => {
        this.formData[id === 'taskName' ? 'name' : 'description'] = e.target.value;
      });
    });

    ['groupName', 'envDetail', 'resourceDetail'].forEach(id => {
      const element = this.node.querySelector(`#${id}`);
      element?.addEventListener('change', e => {
        this.formData[id] = e.target.value;
      });
    });
  }

  updateTaskGroups(taskGroups) {
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
  }

  updateNotebookData(notebookDetail) {
    const { notebook } = notebookDetail;
    if (notebook) {
      this.formData.name = `${notebook.notebookName}-스케줄러`;
      const taskNameInput = this.node.querySelector('#taskName');
      if (taskNameInput) {
        taskNameInput.value = this.formData.name;
      }

      if (notebook.image) {
        // notebookEnvData 저장
        this.notebookEnvData = {
          image: {
            name: notebook.image.name,
            isPublic: notebook.image.isPublic
          },
          processor: notebook.image.processor,
          imageId: notebook.image.id,
          namespace: notebook.namespace
        };

        // formData 업데이트
        this.formData.imageName = notebook.image.name;
        this.formData.isSharedAsset = notebook.image.isPublic;
        this.formData.envType = notebook.image.processor;
        this.formData.envDetail = notebook.image.id;
        this.formData.namespace = notebook.namespace;
      }
      
      this.saveFormData();
    }
  }

  initializeParameterHandlers() {
    const addParamBtn = this.node.querySelector('#addParamBtn');
    const paramTableBody = this.node.querySelector('#paramTableBody');
    const paramKey = this.node.querySelector('#paramKey');
    const paramValue = this.node.querySelector('#paramValue');

    addParamBtn?.addEventListener('click', async () => {
      if (paramKey?.value) {
        const key = paramKey.value.trim();
        const value = paramValue?.value.trim() || '';

        if (this.parameters.has(key)) {
          await showDialog({
            title: '파라미터 오류',
            body: '이미 존재하는 파라미터 키입니다.',
            buttons: [Dialog.okButton()]
          });
          return;
        }

        this.parameters.set(key, value);
        this.updateParamTable();
        this.updateCommand();

        paramKey.value = '';
        paramValue.value = '';
      }
    });

    this.commandInput?.addEventListener('change', () => {
      this.updateCommand();
    });
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

        const valueInput = row.querySelector('.param-value-input');
        valueInput?.addEventListener('change', e => {
          this.parameters.set(key, e.target.value.trim());
          this.updateCommand();
        });

        const deleteBtn = row.querySelector('.btn-danger');
        deleteBtn?.addEventListener('click', () => {
          this.parameters.delete(key);
          row.remove();
          this.updateCommand();
        });
      });
    }
  }

  updateCommand() {
    if (this.commandInput && !this.commandInput.disabled) {
      const currentCommand = this.commandInput.value;
      let prefix = '';
      let paramStart = currentCommand.indexOf('--');
      
      if (paramStart !== -1) {
        prefix = currentCommand.substring(0, paramStart).trim();
      } else {
        prefix = currentCommand.trim();
      }

      const paramCommands = Array.from(this.parameters.entries())
        .map(([key, value]) => `--${key}=${value}`)
        .join(' ');

      this.commandInput.value = prefix
        ? `${prefix} ${paramCommands}`
        : paramCommands;
    }
  }

  updateResourceOptions(computeData) {
    const resourceTypeSelect = this.node.querySelector('#resourceType');
    if (resourceTypeSelect && computeData?.types) {
      resourceTypeSelect.innerHTML = '<option value="">자원 종류</option>';
      computeData.types.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        resourceTypeSelect.appendChild(option);
      });
    }
  }

  updateEnvDetailOptions(processor) {
    const envDetailSelect = this.node.querySelector('#envDetail');
    if (!envDetailSelect) return;

    console.log('updateEnvDetailOptions',processor)
  
    envDetailSelect.innerHTML = '<option value="">세부 내용 선택</option>';
    const filteredImages = this.api.imageData?.images.filter(
      img => img.processor === processor
    ) || [];
  
    filteredImages.forEach(image => {
      const option = document.createElement('option');
      option.value = image.id;
      option.textContent = image.displayName || image.name;
      envDetailSelect.appendChild(option);
    });
  }

  updateResourceDetailOptions(typeId) {
    const resourceDetailSelect = this.node.querySelector('#resourceDetail');
    if (!resourceDetailSelect) return;
  
    resourceDetailSelect.innerHTML = '<option value="">세부 자원</option>';
    
    const details = this.api.getResourceDetailsList(typeId);
    details.forEach(detail => {
      const option = document.createElement('option');
      option.value = detail.name;
      option.textContent = `${detail.name} (CPU: ${detail.cpu}, Memory: ${detail.memory}${detail.gpu > 0 ? `, GPU: ${detail.gpu}` : ''})`;
      resourceDetailSelect.appendChild(option);
    });
  }

  async handleSubmit() {
    this.saveFormData();

    const validationError = this.api.validateForm(this.formData);
    if (validationError) {
      await showDialog({
        title: '입력 오류',
        body: validationError,
        buttons: [Dialog.okButton()]
      });
      return;
    }

    try {
      await this.api.createTask(this.formData);
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
    // 폼 필드 초기화
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

    Object.entries(elements).forEach(([id, value]) => {
      const element = this.node.querySelector(`#${id}`);
      if (element) element.value = value;
    });

    // 파라미터 테이블 초기화
    const paramTableBody = this.node.querySelector('#paramTableBody');
    if (paramTableBody) paramTableBody.innerHTML = '';
    this.parameters.clear();

    // 환경 설정 초기화
    const predefinedRadio = this.node.querySelector(
      'input[name="envSet"][value="predefined"]'
    );
    if (predefinedRadio) predefinedRadio.checked = true;

    const envSelectors = this.node.querySelector('#envSelectors');
    if (envSelectors) envSelectors.style.display = 'none';

    // formData 초기화
    this.formData = { ...defaultData };
  }

  async updateFilePath(path) {
    this.currentPath = path;
    const pathDisplay = this.node.querySelector('.current-path');
    if (pathDisplay) {
      pathDisplay.textContent = `현재 열린 파일: ${this.currentPath}`;
    }

    this.formData.outputPath = path;
    this.toggleSections(path);
  }

  toggleSections(path) {
    const commandSection = this.node.querySelector('#commandSection');
    const isNotebook = path.endsWith('.ipynb');
  
    if (isNotebook) {
      if (commandSection) commandSection.style.display = 'none';
    } else {
      if (commandSection) commandSection.style.display = 'block';
    }
  }

  restoreFormData() {
    // formData 복원
    Object.entries(this.formData).forEach(([key, value]) => {
      const element = this.node.querySelector(`#${key}`);
      if (element) {
        if (element.tagName === 'SELECT') {
          element.value = value;
        } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.value = value;
        }
      }
    });

    // 파라미터 복원
    if (this.formData.runParameters?.length > 0) {
      this.formData.runParameters.forEach(param => {
        this.parameters.set(param.key, param.value);
      });
      this.updateParamTable();
    }
  }

  saveFormData() {
    const formElements = {
      taskName: 'name',
      taskDescription: 'description',
      groupName: 'experimentId',
      resourceType: 'resourceType',
      resourceDetail: 'resourceDetail',
      command: 'executionCommand',
      envType: 'envType',
      envDetail: 'envDetail'
    };

    // 기본 폼 필드 데이터 저장
    Object.entries(formElements).forEach(([elementId, dataKey]) => {
      const element = this.node.querySelector(`#${elementId}`);
      if (element) {
        if (this.currentPath?.endsWith('.ipynb') && elementId === 'command') {
          this.formData.executionCommand = '';  // ipynb 파일인 경우 executionCommand를 빈 문자열로 설정
        } else {
          this.formData[dataKey] = element.value;
        }
      }
    });

    // 환경 설정 처리
    const envSet = document.querySelector('input[name="envSet"]:checked').value;
    this.formData.envSet = envSet;

    if (envSet === "predefined") {
      // 기존 자원 활용인 경우
      if (this.notebookEnvData?.image) {
        this.formData.imageName = this.notebookEnvData.image.name;
        this.formData.isSharedAsset = this.notebookEnvData.image.isPublic;
        this.formData.envType = this.notebookEnvData.processor;
        this.formData.envDetail = this.notebookEnvData.imageId;
      }
    } else {
      // 새로운 환경 구성인 경우
      const envDetail = this.node.querySelector('#envDetail')?.value;
      if (envDetail) {
        const imageInfo = this.api.getImageDetails(envDetail);
        if (imageInfo) {
          this.formData.imageName = imageInfo.name;
          this.formData.isSharedAsset = imageInfo.isPublic || false;
        }
      }
    }

    // 리소스 정보 처리
    const resourceType = this.node.querySelector('#resourceType')?.value;
    const resourceDetail = this.node.querySelector('#resourceDetail')?.value;
    if (resourceType && resourceDetail) {
      // setResourceInfo 메서드 호출하여 리소스 관련 필드 설정
      this.formData = this.api.setResourceInfo(
        this.formData,
        resourceType,
        resourceDetail
      );
    }

    // 파라미터 및 namespace 처리
    this.formData.runParameters = Array.from(this.parameters.entries()).map(
      ([key, value]) => ({ key, value })
    );
    // namespace 설정
    this.formData.namespace = this.formData.namespace || "";
  }
}

class SchedulerWidget extends Widget {
  constructor(app) {
    super();
    this.addClass('jp-scheduler-widget');
    this.id = 'scheduler-widget';
    this.title.label = '스케줄러 등록';

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
    this.addClass('jp-scheduler-status-widget');
    this.id = 'scheduler-status-widget';
    this.title.label = '스케줄러 이력';
    this.api = new SchedulerAPI();

    this.node.innerHTML = schedulerStatusTemplate;

    this.initializeContent();
    this.startPeriodicRefresh();
  }

  initializeContent() {
    const taskList = this.node.querySelector('#taskList');
    if (taskList) {
      this.updateTaskList([]);
    }
  }

  updateTaskList(tasks) {
    const taskList = this.node.querySelector('#taskList');
    if (!taskList) return;

    taskList.innerHTML = '';

    if (!Array.isArray(tasks) || tasks.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML =
        '<td colspan="2" style="text-align: center;">작업이 없습니다</td>';
      taskList.appendChild(emptyRow);
      return;
    }

    const recentTasks = [...tasks]
      .filter(task => task && task.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    recentTasks.forEach(task => {
      try {
        const row = this.createTaskRow(task);
        taskList.appendChild(row);
      } catch (e) {
        console.error('Error creating task row:', e, task);
      }
    });
  }

  createTaskRow(task) {
    const tr = document.createElement('tr');
    tr.className = 'task-row';
    tr.innerHTML = `
      <td>
        <div class="status-cell">
          ${this.getStatusIcon(task.status)}
          <span class="status ${task.status}">${task.status}</span>
        </div>
      </td>
      <td class="name-cell">${task.name}</td>
    `;

    tr.addEventListener('click', () => this.openTaskDetail(task));
    return tr;
  }

  getStatusIcon(status) {
    const icons = {
      running: `<svg class="icon spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" stroke-width="4" stroke-dasharray="30 30" />
                </svg>`,
      error: '🔴',
      failed: '🔴',
      success: '🟢',
      default: '⚪'
    };
    return icons[status] || icons.default;
  }

  openTaskDetail(task) {
    const params = new URLSearchParams({
      executableId: task.executableId,
      assetId: task.executable.assetId
    }).toString();

    window.open(`${SCHEDULER_DETAIL_PAGE_URL}/${task.id}?${params}`);
  }

  async fetchTasks() {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const formatDate = date => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
      };

      const fromDate = formatDate(startDate);
      const toDate = formatDate(endDate);

      const tasks = await this.api.fetchTasks(fromDate, toDate);
      this.updateTaskList(tasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  }

  startPeriodicRefresh() {
    this.fetchTasks();
    setInterval(() => {
      this.fetchTasks();
    }, 5000);
  }
}

class SchedulerPanel extends SidePanel {
  constructor(app) {
    super();
    this.addClass('jp-SchedulerPanel');
    this.title.icon = new LabIcon({ 
      name: 'scheduler:play',
      svgstr: `<svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>`
    });
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

/**
 * Jupyter Lab 플러그인 설정
 */
const plugin = {
  id: 'scheduler-jupyter-extension:plugin',
  description: 'A JupyterLab extension for scheduling.',
  autoStart: true,
  requires: [ICommandPalette, IFileBrowserFactory],
  activate: function(app, palette, fileBrowser) {
    console.log('JupyterLab extension scheduler-jupyter-extension is activated!');

    // 패널 생성
    const panel = new SchedulerPanel(app);

    // 커맨드 등록
    const command = 'scheduler:toggle';
    app.commands.addCommand(command, {
      label: 'Toggle Scheduler',
      execute: () => {
        if (!panel.isAttached) {
          app.shell.add(panel, 'left');
        }
        app.shell.activateById(panel.id);
      }
    });

    // 팔레트에 커맨드 추가
    palette.addItem({
      command,
      category: 'Scheduler'
    });

    // 패널을 왼쪽 사이드바에 추가
    app.shell.add(panel, 'left', { rank: 200 });

    // 활성 위젯 변경 이벤트 리스너 
    app.shell.currentChanged.connect((_, change) => {
      if (change.newValue instanceof DocumentWidget) {
        const path = change.newValue.context.path;
        const isValidFile = path.endsWith('.py') || path.endsWith('.ipynb');
        
        if (path && isValidFile) {
          panel.updateFilePath(path);
        }
      }
    });

    // 파일 브라우저 선택 변경 이벤트 리스너
    if (fileBrowser?.defaultBrowser?.selectionChanged) {
      fileBrowser.defaultBrowser.selectionChanged.connect((_, selection) => {
        if (selection.first) {
          const item = selection.first;
          const isValidFile = item.path.endsWith('.py') || item.path.endsWith('.ipynb');
          
          if (isValidFile) {
            panel.updateFilePath(item.path);
          }
        }
      });
    } else {
      console.warn('File browser or selection changed event not available');
    }
  }
};

export default plugin;