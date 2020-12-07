const verticals = {
  bank: {
    id: 'bank',
    prefix: 'dcwxmbank',
    username: 'dcwxmbankadmin',
    agentRoleId: '5e9964534e67f10e4873af46',
    supervisorRoleId: '5e99645c25d9431884faad71',
    departmentId: '5e9964764e67f10e4873af47',
    supervisorViews: [
      'Contact Center',
      'ATM',
      'Net Banking',
      'Branch',
      'Overall Experience'
    ],
    agentViews: [
      'Agent Dashboard'
    ]
  },
  heal: {
    id: 'heal',
    prefix: 'dcwxmheal',
    username: 'dcwxmhealadmin',
    agentRoleId: '5fae38dddb430f00d09de46f',
    supervisorRoleId: '5fae38e9d82ff619989ecdcb',
    departmentId: '5fae391adb430f00d09de489',
    supervisorViews: [
      'Overall Experience',
      'Contact Center',
      'Clinic',
      'Website',
      'Pharmacy'
    ],
    agentViews: [
      'Contact Center'
    ]
  },
  product: {
    id: 'product',
    prefix: 'dcwxmproduct',
    username: 'dcwxmproductadmin',
    agentRoleId: '5fae3b82d82ff619989ecec7',
    supervisorRoleId: '5fae3b7cdb430f00d09de56c',
    departmentId: '5fae3b91d82ff619989eced1',
    supervisorViews: [
      'Overall Experience',
      'Post Webex Meeting Web Experience',
      'Webex Teams',
      'Webex Devices',
      'Webex Calling'
    ],
    agentViews: [
      'Webex Teams'
    ]
  },
  retail: {
    id: 'retail',
    prefix: 'dcwxmretail',
    username: 'dcwxmretailadmin',
    agentRoleId: '5fae3b4cd82ff619989eceb3',
    supervisorRoleId: '5fae3b59d82ff619989ecebd',
    departmentId: '5fae3b66db430f00d09de564',
    supervisorViews: [
      'Contact Center',
      'Overall Experience',
      'Store Experience',
      'In App Experience',
      'Delivery Experience'
    ],
    agentViews: [
      'Contact Center'
    ]
  }
}

module.exports = verticals
