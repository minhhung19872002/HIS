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
