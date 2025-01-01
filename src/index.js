import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ServerConnection } from '@jupyterlab/services';

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
  computeResourcesBaseURL: 'http://aidev.samsungdisplay.net',
  endpoints: {
    taskGroups: '/extension/scheduler/experiments/users/${userId}',
    images: '/extension/images/users/${userId}',
    computeResources: '/resources',
    createTask: '/extension/scheduler/runs',
    tasks: '/extension/notebooks/${notebookId}/runs',
    notebookDetail: '/extension/notebooks/${notebookId}/detail'
  }
};

const SCHEDULER_DETAIL_PAGE_URL = "http//aidev.samsungdisplay.net/#/aipt/namu/schduler/job";

// SSL 인증서 검증 비활성화 (전역 설정)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const schdulerIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g clip-path="url(#clip0_316_2125)">
    <path d="M3.90909 20.5L6.30455 18.5L3.90909 20.18V20.5ZM3 15V22L8 18.5L3 15Z" fill="#999999"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M18.1111 5H4.88889C3.84056 5 3 5.84375 3 6.875V13.5314C3.30529 13.4698 3.62129 13.4375 3.94488 13.4375C4.26817 13.4375 4.58386 13.4697 4.88889 13.5312V8.75H18.1111V18.125H8.6671C8.6671 18.7917 8.5269 19.4258 8.27417 20H18.1111C19.15 20 20 19.1562 20 18.125V6.875C20 5.84375 19.1594 5 18.1111 5ZM10.5556 15.3828L9.23333 16.7188L5.83333 13.3438L9.23333 9.96875L10.5556 11.3047L8.50139 13.3438L10.5556 15.3828ZM13.7667 16.7188L17.1667 13.3438L13.7667 9.96875L12.4444 11.3047L14.4986 13.3438L12.4444 15.3828L13.7667 16.7188Z" fill="#999999"/>
  </g>
  <defs>
    <clipPath id="clip0_316_2125">
      <rect width="24" height="24" fill="white"/>
    </clipPath>
  </defs>
</svg>`;


// API 클래스 구현
class SchedulerAPI {
  constructor() {
    this.imageData = null;
    this.computeResourceData = null;
    this._userId = null;
  }

  async initialize() {
    const notebookId = this.extractNotebookId();
    if (notebookId) {
      try {
        const notebookDetail = await this.fetchNotebookDetail(notebookId);
        if (notebookDetail?.notebook?.userId) {
          this._userId = notebookDetail.notebook.userId;
          return;
        }
      } catch (error) {
        console.error('Error fetching notebook details:', error);
      }
    }
    // notebook detail에서 userId를 가져오지 못한 경우 URL에서 추출
    this._userId = this.extractUserIdFromUrl();
  }

  extractUserIdFromUrl() {
    try {
      const settings = ServerConnection.makeSettings();
      console.log('Server URL:', settings);
      const url = window.location.href;
      const match = url.match(/\/notebook\/([^/]+)\/notebook-/);
      if (match && match[1]) {
        return match[1].replace('-', '.');
      }
      console.log('찾기 실패 window.location.href', window.location.href);
      return "beomjourr.park";
    } catch (error) {
      console.error("Error extracting user ID:", error);
      return null;
    }
  }

  getuserId() {
    return this._userId;
  }

  getUrlWithUserId(endpoint) {
    console.log('userId', this._userId)
    return endpoint.replace('${userId}', this._userId);
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

  async fetchTasks(fromDate) {
    try {
      const notebookId = this.extractNotebookId();
      if (!notebookId) {
        console.error('Failed to extract notebook ID');
        return [];
      }
        
      const endpoint = API_CONFIG.endpoints.tasks
        .replace('${notebookId}', notebookId)
        + `?fromDate=${fromDate}`;
        
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
      const url = window.location.href;
      const match = url.match(/\/notebook-(\d+)\//);
      if (match && match[1]) {
        return match[1];
      }
      return "1895";
    } catch (error) {
      console.error("Error extracting notebook ID:", error);
      return null;
    }
  }

  validateForm(formData) {
    const requiredFields = {
      name: '작업명',
      executionFilePath: '실행 파일',
      resourceName: '연산 필요 자원',
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!formData[field]) {
        return `${label}을(를) 입력해주세요.`;
      }
    }
  
    // 개발환경세트는 새로운 환경 구성일 때만 필수
    const envSet = document.querySelector('input[name="envSet"]:checked')?.value;
    if (envSet === 'custom' && !formData.imageName) {
      return '개발환경세트를 입력해주세요.';
    }
  
    return null;
  }
}


class ContentWidget extends Widget {
  constructor(app) {
    super();
    this.addClass('jp-scheduler-content');
    this.api = new SchedulerAPI();
    this.app = app;
    this.currentPath = '파일이 선택되지 않았습니다';
    this.parameters = new Map();
    this.formData = {
      name: "",
      description: "",
      experimentId: null,
      executionFilePath: "",
      createUserId: "",
      userName: "",
      imageId: null,
      codeType: "",
      resourceGpuType: "",
      resourceCpu: "",
      resourceMemory: "",
      resourceName: "", 
      resourceGpu: "",
      namespace: "",
      notebookId: "",
      executionCommand: "",
      runParameters: []
    };
    this.notebookEnvData = null;
    this.imageData = null;

    this.node.innerHTML = schedulerTemplate;
    this.commandInput = this.node.querySelector('#command');
    
    this.initializeContent();
    this.initializeEventHandlers();
  }

  async initializeContent() {
    try {
      // userId 초기화를 먼저 수행
      await this.api.initialize();

      const { taskGroups, imageData, computeResourceData } = 
        await this.api.initializeData();
  
      this.updateTaskGroups(taskGroups);
      this.updateResourceOptions(computeResourceData);
      
      if (imageData) {
        this.imageData = imageData;
        this.updateEnvTypeOptions();
      }
  
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

    } catch (error) {
      console.error('Error initializing content:', error);
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
          if (envSelectors) {
            envSelectors.style.display = 'block';
            this.updateEnvTypeOptions();
          }
        } else {
          if (envSelectors) envSelectors.style.display = 'none';
          if (this.notebookEnvData) {
            this.formData.imageId = null;
          }
        }
      });
    });

    // 드롭다운 이벤트
    const envTypeSelect = this.node.querySelector('#envType');
    if (envTypeSelect) {
      envTypeSelect.addEventListener('change', e => {
        const selectedProcessor = e.target.value;
        if (selectedProcessor) {
          this.updateEnvDetailOptions(selectedProcessor);
        }
      });
    }

    // 리소스 타입 선택
    const resourceTypeSelect = this.node.querySelector('#resourceType');
    if (resourceTypeSelect) {
      resourceTypeSelect.addEventListener('change', e => {
        const selectedType = e.target.value;
        if (selectedType) {
          this.updateResourceDetailOptions(selectedType);
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

  updateEnvTypeOptions() {
    const envTypeSelect = this.node.querySelector('#envType');
    const envDetailSelect = this.node.querySelector('#envDetail');
    
    if (!envTypeSelect || !this.imageData?.images) return;
    
    envTypeSelect.innerHTML = '<option value="">환경 선택</option>';
    envDetailSelect.innerHTML = '<option value="">세부 내용 선택</option>';
    
    const filteredImages = this.imageData.images.filter(img => img.state === "PUSHED");
    const processors = [...new Set(filteredImages.map(img => img.processor))];
    
    processors.forEach(processor => {
      const option = document.createElement('option');
      option.value = processor;
      option.textContent = processor;
      envTypeSelect.appendChild(option);
    });
  }

  updateNotebookData(notebookDetail) {
    const { notebook } = notebookDetail;
    if (notebook) {
      this.formData.name = `${notebook.notebookName}-스케줄러`;
      const taskNameInput = this.node.querySelector('#taskName');
      if (taskNameInput) {
        taskNameInput.value = this.formData.name;
      }

      console.log('notebook', notebook)

      if (notebook.image) {
        this.notebookEnvData = {
          image: {
            id: notebook.image.id,
          },
          notebookId: notebook.notebookId,
          processor: notebook.image.processor,
          namespace: notebook.namespace,
          userId: notebook.userId,
          userName: notebook.userName
        };

        this.formData.imageId = notebook.image.id;
        this.formData.namespace = notebook.namespace;
        this.formData.createUserId = notebook.userId;
        this.formData.userName = notebook.userName;
      }
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
            <button class="icon-button delete btn-danger" title="파라미터 삭제">          
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clip-path="url(#clip0_313_2097)">
                  <path d="M6.85714 18.2222C6.85714 19.2 7.62857 20 8.57143 20H15.4286C16.3714 20 17.1429 19.2 17.1429 18.2222V7.55556H6.85714V18.2222ZM8.96571 11.8933L10.1743 10.64L12 12.5244L13.8171 10.64L15.0257 11.8933L13.2086 13.7778L15.0257 15.6622L13.8171 16.9156L12 15.0311L10.1829 16.9156L8.97429 15.6622L10.7914 13.7778L8.96571 11.8933ZM15 4.88889L14.1429 4H9.85714L9 4.88889H6V6.66667H18V4.88889H15Z" fill="#CCCCCC"/>
                </g>
                <defs>
                  <clipPath id="clip0_313_2097">
                    <rect width="24" height="24" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </button>
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

  saveFormData() {
    // 기본 폼 필드 업데이트
    const formElements = {
      taskName: 'name',
      taskDescription: 'description',
      groupName: 'experimentId'
    };

    // 필수 폼 필드 데이터 저장
    Object.entries(formElements).forEach(([elementId, dataKey]) => {
      const element = this.node.querySelector(`#${elementId}`);
      if (element) {
        this.formData[dataKey] = element.value;
      }
    });

    // 환경 설정 처리
    const envSet = document.querySelector('input[name="envSet"]:checked')?.value;
    if (envSet === "predefined") {
      // 기존 자원 활용인 경우
      if (this.notebookEnvData?.image) {
        this.formData.imageId = null;
      }
    } else {
      // 새로운 환경 구성인 경우
      const envDetail = this.node.querySelector('#envDetail')?.value;
      if (envDetail && this.imageData) {
        const imageInfo = this.imageData.images.find(img => img.id === Number(envDetail));
        console.log('envDetail',envDetail );
        if (imageInfo) {
          this.formData.imageId = imageInfo.id;
        }
      }
    }

    // 리소스 정보 처리
    const resourceType = this.node.querySelector('#resourceType')?.value;
    const resourceDetail = this.node.querySelector('#resourceDetail')?.value;
    if (resourceType && resourceDetail && this.api.computeResourceData?.details) {
      const resourceInfo = this.api.computeResourceData.details[resourceType]?.find(
        detail => detail.name === resourceDetail
      );
      
      if (resourceInfo) {
        this.formData.resourceCpu = resourceInfo.cpu;
        this.formData.resourceMemory = resourceInfo.memory;
        this.formData.resourceGpu = resourceInfo.gpu;
        this.formData.resourceGpuType = resourceInfo.gpuType || "";
        this.formData.resourceName = resourceInfo.name;
      }
    }

    // 실행 파일 경로
    if (this.currentPath && this.currentPath !== '파일이 선택되지 않았습니다') {
      // 경로가 /로 시작하지 않으면 /를 추가
      const normalizedPath = this.currentPath.startsWith('/') 
      ? this.currentPath 
      : `/${this.currentPath}`;
        
      this.formData.executionFilePath = normalizedPath;
      this.formData.codeType = this.currentPath.endsWith('.ipynb') ? 'CODE' : 'PYTHON';
    }

    // 실행 명령어
    if (this.commandInput && !this.currentPath.endsWith('.ipynb')) {
      this.formData.executionCommand = this.commandInput.value;
    } else {
      this.formData.executionCommand = '';
    }

    // 파라미터 처리
    this.formData.runParameters = Array.from(this.parameters.entries()).map(
      ([key, value]) => ({ key, value })
    );

    this.formData.notebookId = this.notebookEnvData?.notebookId
    this.formData.namespace = this.notebookEnvData?.namespace || "";
    this.formData.createUserId = this.notebookEnvData?.userId || "";
    this.formData.userName = this.notebookEnvData?.userName || "";
  }

  async handleSubmit() {
    this.saveFormData();
    console.log('Form Data to submit:', this.formData);
    
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
    this.formData = {
      name: "",
      description: "",
      experimentId: null,
      executionFilePath: "",
      createUserId: "",
      userName: "",
      imageId: null,
      codeType: "",
      resourceGpuType: "",
      resourceCpu: "",
      resourceMemory: "",
      resourceName: "",
      resourceGpu: "",
      namespace: "",
      executionCommand: "",
      runParameters: []
    };
  }

  async updateFilePath(path) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    this.currentPath = normalizedPath;
    const pathDisplay = this.node.querySelector('.current-path');
    if (pathDisplay) {
      pathDisplay.textContent = `현재 열린 파일: ${this.currentPath}`;
    }

    this.formData.executionFilePath = normalizedPath;
    this.formData.codeType = path.endsWith('.ipynb') ? 'CODE' : 'PYTHON';
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

  updateCommand() {
    if (this.commandInput && !this.commandInput.disabled) {
      const currentCommand = this.commandInput.value;
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
      this.formData.executionCommand = newCommand;
    }
  }

  updateTaskGroups(taskGroups) {
    const groupSelect = this.node.querySelector('#groupName');
    if (groupSelect && Array.isArray(taskGroups)) {
      groupSelect.innerHTML = '<option value="">선택하세요</option>';
      taskGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        groupSelect.appendChild(option);
      });
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

  updateEnvDetailOptions(processor) {
    const envDetailSelect = this.node.querySelector('#envDetail');
    if (!envDetailSelect || !this.imageData?.images) return;

    envDetailSelect.innerHTML = '<option value="">세부 내용 선택</option>';
    
    const filteredImages = this.imageData.images.filter(
      img => img.state === "PUSHED" && img.processor === processor
    );

    filteredImages.forEach(image => {
      const option = document.createElement('option');
      option.value = image.id;
      option.textContent = image.displayName || image.name;
      envDetailSelect.appendChild(option);
    });
  }

  initializeFormFieldHandlers() {
    ['taskName', 'taskDescription'].forEach(id => {
      const element = this.node.querySelector(`#${id}`);
      element?.addEventListener('change', e => {
        this.formData[id === 'taskName' ? 'name' : 'description'] = e.target.value;
      });
    });

    ['groupName'].forEach(id => {
      const element = this.node.querySelector(`#${id}`);
      element?.addEventListener('change', e => {
        this.formData.experimentId = e.target.value;
      });
    });
  }
}

class SchedulerWidget extends Widget {
  constructor(app) {
    super();
    this.addClass('jp-scheduler-widget');
    this.id = 'scheduler-widget';
    this.title.label = '스케줄러 생성';

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

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    this.fromDate = this.formatDate(startDate);

    this.node.innerHTML = schedulerStatusTemplate;

    this.initializeContent();
    this.startPeriodicRefresh();
  }

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
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
    switch (status) {
      case "Running":
      case "Creating":
      case "Scheduling":
        return `<svg class="icon spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="4" stroke-dasharray="30 30" />
          </svg>`;
      case "Error":
      case "Failed":
        return `<span style="font-size: 16px;">🔴</span>`;
      case "Succeded":
        return `<span style="font-size: 16px;">🟢</span>`;
      default:
        return "⚪";
    }
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
      const tasks = await this.api.fetchTasks(this.fromDate);
      console.log('taskList', tasks)
      this.updateTaskList(tasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  }

  startPeriodicRefresh() {
    this.fetchTasks();
    this.refreshInterval = setInterval(() => {
      this.fetchTasks();
    }, 5000);
  }

  dispose() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    super.dispose();
  }
}

class SchedulerPanel extends SidePanel {
  constructor(app) {
    super();
    this.addClass('jp-SchedulerPanel');
    this.title.icon = new LabIcon({ 
      name: 'scheduler:play',
      svgstr: schdulerIcon,
    });
    this.title.caption = '스케줄러';
    this.id = 'scheduler-panel';

    this.widget = new SchedulerWidget(app);
    this.widget.title.label = '스케줄러 생성';

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

    // 팔레트에 커맨드 추가
    palette.addItem({
      command,
      category: 'Scheduler'
    });

    // 툴바 버튼 추가
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
    const playIcon = new LabIcon({ 
      name: 'scheduler:play',
      svgstr: schdulerIcon,
    });
    playIcon.element({
      container: icon,
      tag: 'span',
      elementPosition: 'center',
    });

    button.appendChild(icon);
    toolbarButton.node.appendChild(button);
    app.shell.add(toolbarButton, 'top', { rank: 1000 });

    // 현재 활성화된 파일이 변경될 때 버튼 표시/숨김 처리
    app.shell.currentChanged.connect((_, change) => {
      if (change.newValue instanceof DocumentWidget) {
        const path = change.newValue.context.path;
        const isValidFile = path.endsWith('.py') || path.endsWith('.ipynb');
        
        if (isValidFile) {
          toolbarButton.show();
        } else {
          toolbarButton.hide();
        }
      } else {
        toolbarButton.hide();
      }
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