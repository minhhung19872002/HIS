describe('Queue Display System', () => {
  const FAKE_ROOM_ID = '00000000-0000-0000-0000-000000000001';

  it('loads without authentication at /queue-display', () => {
    // Clear auth to confirm page works without login
    cy.clearLocalStorage();
    cy.visit(`/queue-display?rooms=${FAKE_ROOM_ID}&queueType=2`);
    cy.get('.queue-display').should('exist');
  });

  it('has no sidebar or main layout header', () => {
    cy.clearLocalStorage();
    cy.visit(`/queue-display?rooms=${FAKE_ROOM_ID}&queueType=2`);
    cy.get('.ant-layout-sider').should('not.exist');
    cy.get('.ant-layout-header').should('not.exist');
  });

  it('displays hospital name in header', () => {
    cy.clearLocalStorage();
    cy.visit(`/queue-display?rooms=${FAKE_ROOM_ID}&queueType=2`);
    cy.get('.queue-header-left h1').should('contain.text', 'BỆNH VIỆN ĐA KHOA ABC');
  });

  it('displays a live clock', () => {
    cy.clearLocalStorage();
    cy.visit(`/queue-display?rooms=${FAKE_ROOM_ID}&queueType=2`);
    cy.get('.queue-clock').invoke('text').then(time1 => {
      // Clock text should be non-empty and contain colons (HH:MM:SS)
      expect(time1).to.match(/\d{1,2}:\d{2}:\d{2}/);
    });
  });

  it('polls the queue display API', () => {
    cy.clearLocalStorage();
    cy.intercept('GET', `**/api/reception/queue/display/${FAKE_ROOM_ID}*`).as('queuePoll');
    cy.visit(`/queue-display?rooms=${FAKE_ROOM_ID}&queueType=2`);
    cy.wait('@queuePoll', { timeout: 10000 });
  });

  it('shows calling and waiting panels', () => {
    cy.clearLocalStorage();
    cy.visit(`/queue-display?rooms=${FAKE_ROOM_ID}&queueType=2`);
    cy.contains('h2', 'Đang gọi').should('be.visible');
    cy.contains('h2', 'Danh sách chờ').should('be.visible');
  });

  it('shows waiting table headers', () => {
    cy.clearLocalStorage();
    cy.visit(`/queue-display?rooms=${FAKE_ROOM_ID}&queueType=2`);
    cy.get('.queue-waiting-table thead th').should('have.length', 5);
    cy.get('.queue-waiting-table thead').should('contain.text', 'STT');
    cy.get('.queue-waiting-table thead').should('contain.text', 'Phòng');
  });

  it('shows footer with stats', () => {
    cy.clearLocalStorage();
    cy.visit(`/queue-display?rooms=${FAKE_ROOM_ID}&queueType=2`);
    cy.get('.queue-footer').should('be.visible');
    cy.get('.queue-footer').should('contain.text', 'Tổng chờ');
    cy.get('.queue-footer').should('contain.text', 'phút');
  });

  it('shows audio overlay on first load', () => {
    cy.clearLocalStorage();
    cy.visit(`/queue-display?rooms=${FAKE_ROOM_ID}&queueType=2`);
    cy.get('.audio-overlay').should('be.visible');
    cy.get('.audio-overlay').should('contain.text', 'Bật âm thanh');
  });

  it('can dismiss audio overlay', () => {
    cy.clearLocalStorage();
    cy.visit(`/queue-display?rooms=${FAKE_ROOM_ID}&queueType=2`);
    cy.get('.audio-overlay').should('be.visible');
    cy.contains('button', 'Bỏ qua').click();
    cy.get('.audio-overlay').should('not.exist');
  });

  it('has fullscreen button', () => {
    cy.clearLocalStorage();
    cy.visit(`/queue-display?rooms=${FAKE_ROOM_ID}&queueType=2`);
    cy.get('.queue-fullscreen-btn').should('exist');
  });

  it('shows instruction when no rooms param', () => {
    cy.clearLocalStorage();
    cy.visit('/queue-display');
    cy.get('.queue-display').should('contain.text', '?rooms=');
  });

  it('applies priority color classes with mocked data', () => {
    const mockData: any = {
      roomId: FAKE_ROOM_ID,
      roomName: 'Phòng khám 1',
      doctorName: 'Nguyễn Văn A',
      currentServing: {
        id: 'ticket-1',
        ticketCode: 'A-001',
        queueNumber: 1,
        priority: 3,
        priorityName: 'Cấp cứu',
        status: 2,
        statusName: 'Đang gọi',
        estimatedWaitMinutes: 0,
        calledCount: 1,
        queueDate: new Date().toISOString(),
        roomId: FAKE_ROOM_ID,
        roomName: 'Phòng khám 1',
        queueType: 2,
        queueTypeName: 'Khám bệnh',
      },
      callingList: [],
      waitingList: [
        {
          id: 'ticket-2',
          ticketCode: 'A-002',
          queueNumber: 2,
          priority: 1,
          priorityName: 'Thường',
          status: 1,
          statusName: 'Chờ',
          estimatedWaitMinutes: 5,
          calledCount: 0,
          queueDate: new Date().toISOString(),
          roomId: FAKE_ROOM_ID,
          roomName: 'Phòng khám 1',
          queueType: 2,
          queueTypeName: 'Khám bệnh',
        },
        {
          id: 'ticket-3',
          ticketCode: 'B-003',
          queueNumber: 3,
          priority: 2,
          priorityName: 'Ưu tiên',
          status: 1,
          statusName: 'Chờ',
          estimatedWaitMinutes: 10,
          calledCount: 0,
          queueDate: new Date().toISOString(),
          roomId: FAKE_ROOM_ID,
          roomName: 'Phòng khám 1',
          queueType: 2,
          queueTypeName: 'Khám bệnh',
        },
      ],
      totalWaiting: 2,
      averageWaitMinutes: 7,
    };

    cy.clearLocalStorage();
    cy.intercept('GET', `**/api/reception/queue/display/${FAKE_ROOM_ID}*`, {
      statusCode: 200,
      body: mockData,
    }).as('mockQueue');

    cy.visit(`/queue-display?rooms=${FAKE_ROOM_ID}&queueType=2`);
    cy.wait('@mockQueue');

    // Emergency ticket should have red class
    cy.get('.queue-ticket-number.priority-emergency').should('contain.text', 'A-001');

    // Waiting list should show priority badges
    cy.get('.priority-badge.normal').should('contain.text', 'Thường');
    cy.get('.priority-badge.high').should('contain.text', 'Ưu tiên');

    // Footer stats
    cy.get('.queue-footer').should('contain.text', '2');
    cy.get('.queue-footer').should('contain.text', '7 phút');
  });
});

describe('Lab Queue Display (mode=lab)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.on('uncaught:exception', () => false);
  });

  it('loads at /queue-display?mode=lab without auth', () => {
    cy.visit('/queue-display?mode=lab');
    cy.get('.queue-display.lab-mode').should('exist');
  });

  it('shows lab-specific header text', () => {
    cy.visit('/queue-display?mode=lab');
    cy.get('.queue-header-left p').should('contain.text', 'Xét nghiệm');
  });

  it('displays stats bar with 4 metrics', () => {
    cy.visit('/queue-display?mode=lab');
    cy.get('.lab-stats-bar .lab-stat').should('have.length', 4);
    cy.get('.lab-stats-bar').should('contain.text', 'Chờ xử lý');
    cy.get('.lab-stats-bar').should('contain.text', 'Đang xử lý');
    cy.get('.lab-stats-bar').should('contain.text', 'Hoàn thành');
    cy.get('.lab-stats-bar').should('contain.text', 'TB xử lý');
  });

  it('has 3 panels: processing, waiting, completed', () => {
    cy.visit('/queue-display?mode=lab');
    cy.get('.lab-processing').should('exist');
    cy.get('.lab-waiting').should('exist');
    cy.get('.lab-completed').should('exist');
    cy.contains('h2', 'Đang xử lý').should('be.visible');
    cy.contains('h2', 'Chờ xử lý').should('be.visible');
    cy.contains('h2', 'Vừa hoàn thành').should('be.visible');
  });

  it('waiting table has correct columns', () => {
    cy.visit('/queue-display?mode=lab');
    cy.get('.lab-waiting .queue-waiting-table thead th').should('have.length', 7);
    cy.get('.lab-waiting .queue-waiting-table thead').should('contain.text', 'Mã phiếu');
    cy.get('.lab-waiting .queue-waiting-table thead').should('contain.text', 'Bệnh nhân');
    cy.get('.lab-waiting .queue-waiting-table thead').should('contain.text', 'Xét nghiệm');
  });

  it('polls the lab queue display API', () => {
    cy.intercept('GET', '**/api/liscomplete/queue/display*').as('labQueuePoll');
    cy.visit('/queue-display?mode=lab');
    cy.wait('@labQueuePoll', { timeout: 10000 });
  });

  it('shows footer with lab stats', () => {
    cy.visit('/queue-display?mode=lab');
    cy.get('.queue-footer').should('be.visible');
    cy.get('.queue-footer').should('contain.text', 'Tổng chờ');
    cy.get('.queue-footer').should('contain.text', 'Đang XL');
    cy.get('.queue-footer').should('contain.text', 'Hoàn thành');
  });

  it('has audio overlay and fullscreen button', () => {
    cy.visit('/queue-display?mode=lab');
    cy.get('.audio-overlay').should('be.visible');
    cy.get('.queue-fullscreen-btn').should('exist');
    cy.contains('button', 'Bỏ qua').click();
    cy.get('.audio-overlay').should('not.exist');
  });

  it('renders with mocked lab data', () => {
    const mockLabData = {
      updatedAt: new Date().toISOString(),
      totalPending: 5,
      totalProcessing: 3,
      totalCompletedToday: 12,
      averageProcessingMinutes: 25,
      processingItems: [
        {
          id: 'proc-1',
          orderCode: 'XN-2026-0001',
          sampleBarcode: 'BC001',
          patientName: 'Nguyễn Văn A',
          patientCode: 'BN001',
          sampleType: 'Máu',
          testCount: 3,
          testSummary: 'CTM, SHM, Đông máu',
          isPriority: false,
          isEmergency: true,
          status: 3,
          statusName: 'Đang xử lý',
          orderedAt: new Date().toISOString(),
          collectedAt: new Date().toISOString(),
          waitMinutes: 15,
          departmentName: 'Khoa Nội',
        },
      ],
      waitingItems: [
        {
          id: 'wait-1',
          orderCode: 'XN-2026-0002',
          sampleBarcode: 'BC002',
          patientName: 'Trần Thị B',
          patientCode: 'BN002',
          sampleType: 'Nước tiểu',
          testCount: 2,
          testSummary: 'Tổng phân tích NT',
          isPriority: true,
          isEmergency: false,
          status: 1,
          statusName: 'Chờ lấy mẫu',
          orderedAt: new Date().toISOString(),
          waitMinutes: 30,
          departmentName: 'Khoa Ngoại',
        },
      ],
      completedItems: [
        {
          id: 'done-1',
          orderCode: 'XN-2026-0003',
          patientName: 'Lê Văn C',
          patientCode: 'BN003',
          testCount: 1,
          testSummary: 'HbA1c',
          isPriority: false,
          isEmergency: false,
          status: 5,
          statusName: 'Hoàn thành',
          orderedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          waitMinutes: 45,
        },
      ],
    };

    cy.intercept('GET', '**/api/liscomplete/queue/display*', {
      statusCode: 200,
      body: mockLabData,
    }).as('mockLabQueue');

    cy.visit('/queue-display?mode=lab');
    cy.wait('@mockLabQueue');

    // Stats
    cy.get('.lab-stats-bar').should('contain.text', '5');
    cy.get('.lab-stats-bar').should('contain.text', '3');
    cy.get('.lab-stats-bar').should('contain.text', '12');

    // Processing card
    cy.get('.lab-processing .lab-card').should('have.length', 1);
    cy.get('.lab-processing .lab-card').should('contain.text', 'XN-2026-0001');
    cy.get('.lab-processing .lab-card').should('contain.text', 'Nguyễn Văn A');
    cy.get('.lab-processing .lab-card.emergency').should('exist');

    // Waiting table
    cy.get('.lab-waiting tbody tr').should('have.length', 1);
    cy.get('.lab-waiting tbody').should('contain.text', 'XN-2026-0002');
    cy.get('.lab-waiting tbody').should('contain.text', 'Trần Thị B');

    // Completed card
    cy.get('.lab-completed .lab-card').should('have.length', 1);
    cy.get('.lab-completed .lab-card').should('contain.text', 'XN-2026-0003');
    cy.get('.lab-completed .lab-card').should('contain.text', 'Hoàn thành');

    // Footer
    cy.get('.queue-footer').should('contain.text', '5');
    cy.get('.queue-footer').should('contain.text', '25 phút');
  });
});
