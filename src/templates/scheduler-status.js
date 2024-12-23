export const schedulerStatusTemplate = `
  <style>
    .task-table {
      width: 100%;
      border-collapse: collapse;
    }

    .task-table th {
      text-align: left;
      padding: 8px;
      border-bottom: 1px solid var(--jp-border-color2);
      color: var(--jp-ui-font-color1);
      font-weight: normal;
      opacity: 0.8;
    }

    .task-table td {
      padding: 8px;
      border-bottom: 1px solid var(--jp-border-color2);
    }

    .task-row {
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .task-row:hover {
      background-color: var(--jp-layout-color2);
    }

    .status-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 120px;
    }

    .name-cell {
      flex: 1;
    }

    .spinner {
      animation: spin 1s linear infinite;
      width: 16px;
      height: 16px;
    }

    @keyframes spin {
      100% {
        transform: rotate(360deg);
      }
    }

    .status {
      font-size: 12px;
    }

    .status.running {
      color: var(--jp-success-color0);
    }

    .status.error,
    .status.failed {
      color: var(--jp-error-color0);
    }

    .status.success {
      color: var(--jp-success-color0);
    }
  </style>
  <table class="task-table">
    <thead>
      <tr>
        <th style="width: 120px">상태</th>
        <th>스케줄러 명</th>
      </tr>
    </thead>
    <tbody id="taskList"></tbody>
  </table>
`;
