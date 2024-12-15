export const schedulerTemplate = `
  <div class="jp-scheduler-widget">
    <div class="group">
      <div class="group-header collapsed" data-action="toggle">
        <span class="collapse-icon">▼</span>
        <div class="group-title">작업 명세</div>
      </div>
      <div class="group-content collapsed">
        <div class="form-row">
          <label class="form-label required">작업 그룹명</label>
          <select id="groupName">
            <option value="">선택하세요</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label required">작업명</label>
          <input type="text" id="taskName">
        </div>
        <div class="form-row">
          <label class="form-label">작업 설명</label>
          <textarea id="taskDescription"></textarea>
        </div>
      </div>
    </div>

    <div class="group">
      <div class="group-header" data-action="toggle">
        <span class="collapse-icon">▼</span>
        <div class="group-title">작업 구성</div>
      </div>
      <div class="group-content">
        <div class="form-row">
          <label class="form-label required">실행 파일</label>
          <div class="current-path">현재 열린 파일: 파일이 선택되지 않았습니다</div>
        </div>

        <div class="form-row">
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="envSet" value="predefined" checked>
              사전 정의 환경
            </label>
            <label class="radio-label">
              <input type="radio" name="envSet" value="custom">
              커스텀 환경
            </label>
          </div>
          <div id="envSelectors" style="display: none">
            <label class="form-label required">개발환경세트</label>
            <div class="flex-row">
              <select id="envType" class="flex-1">
                <option value="">환경 선택</option>
              </select>
              <select id="envDetail" class="flex-2">
                <option value="">세부 내용 선택</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-row">
          <label class="form-label required">연산 필요 자원</label>
          <div class="flex-row">
            <select id="resourceType" class="flex-1">
              <option value="">자원 종류</option>
            </select>
            <select id="resourceDetail" class="flex-2">
              <option value="">세부 자원</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <label class="form-label">파라미터</label>
          <div class="flex-row">
            <input type="text" id="paramKey" placeholder="키" class="flex-1">
            <input type="text" id="paramValue" placeholder="값" class="flex-1">
            <button class="btn btn-small" id="addParamBtn">추가</button>
          </div>
          <table class="param-table">
            <thead>
              <tr>
                <th>키</th>
                <th>값</th>
                <th>삭제</th>
              </tr>
            </thead>
            <tbody id="paramTableBody"></tbody>
          </table>
        </div>

        <div class="form-row">
          <label class="form-label">실행 명령어</label>
          <input type="text" id="command">
        </div>
      </div>
    </div>

    <div class="submit-container">
      <button class="btn" id="submitBtn">등록</button>
    </div>
  </div>
`;