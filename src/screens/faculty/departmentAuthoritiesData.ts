// Department authorities and decision makers directory.
// Maps each department to its Chairman, Assistant Proctor, and Faculty Dean,
// along with the specific powers/approvals they handle for students.

export type AuthorityRoleType = 'chairman' | 'proctor' | 'dean';

export interface DepartmentAuthority {
  roleType: AuthorityRoleType;
  roleTitle: string; // e.g. "Department Chairman", "Assistant Proctor", "Faculty Dean"
  badgeLabel: string;
  name: string;
  designation: string;
  facultyId?: string | null;
  photoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  room?: string | null;
  building?: string | null;
  counselingHours?: string | null;
  powers: string[];
}

interface RawDeptAuthorityConfig {
  chairman?: {
    name: string;
    designation: string;
    facultyId?: string;
    email?: string;
    room?: string;
    building?: string;
    powers: string[];
  };
  proctor: {
    name: string;
    designation: string;
    facultyId?: string | null;
    email?: string;
    room?: string;
    building?: string;
    powers: string[];
  };
  dean: {
    name: string;
    designation: string;
    facultyId?: string;
    email?: string;
    room?: string;
    building?: string;
    powers: string[];
  };
}

const DEAN_ENGINEERING = {
  name: 'Prof. Dr. Munshi Mahbubur Rahman',
  designation: 'Dean, Faculty of Engineering & Applied Sciences',
  facultyId: 'cba5f42b-7fd3-4de0-9bca-fbce869669f9',
  email: 'mmrahman549@gmail.com',
  powers: [
    'Faculty-wide academic appeals & semester gap permissions',
    'Credit transfers & inter-department waivers',
  ],
};

const DEAN_BUSINESS = {
  name: 'Prof. Dr. Syed Masud Husain',
  designation: 'Dean, Faculty of Business',
  facultyId: '72839cf2-9fc3-46b3-9290-35b1d4133e1e',
  email: 'masud.husain@bubt.edu.bd',
  powers: [
    'Business faculty appeals & graduation clearances',
    'Credit transfer waivers & semester drop approvals',
  ],
};

const DEAN_ARTS = {
  name: 'Prof Dr. K Ahmed Alam',
  designation: 'Dean, Faculty of Arts & Humanities',
  facultyId: 'c8945f41-9bc5-4279-9683-90efef0982ff',
  email: 'kaabd1974@gmail.com',
  powers: [
    'Faculty-wide academic appeals & curriculum policies',
    'Credit transfers & inter-department waivers',
  ],
};

const DEAN_LAW = {
  name: 'Dr. Md. Milan Hossain',
  designation: 'Dean, Faculty of Law',
  facultyId: '0c7f3319-c508-4734-867e-7ee77aacbc32',
  email: 'milondu97@gmail.com',
  powers: [
    'Law faculty appeals & academic policies',
    'Credit transfers & inter-university clearances',
  ],
};

const PROCTOR_CENTRAL = {
  name: 'Wing Cdr. Md. Momenul Islam (Retd.)',
  designation: 'Chief Proctor, Office of the Proctor',
  facultyId: null,
  email: 'proctor@bubt.edu.bd',
  room: 'Ground Floor',
  building: 'Admin Building (Ext: 108)',
  powers: [
    'Campus security, student discipline & code of conduct',
    'Harassment, anti-ragging & dispute investigations',
    'Confiscated or lost student ID card clearances',
  ],
};

// Department number mappings
const DEPARTMENT_AUTHORITIES_CONFIG: Record<string, RawDeptAuthorityConfig> = {
  // CSE
  '27': {
    chairman: {
      name: 'Md. Saifur Rahman',
      designation: 'Assistant Professor & Acting Chairman',
      facultyId: '705fd14a-0021-462f-b883-112e24f4dedc',
      email: 'saifurs@gmail.com',
      room: '301',
      building: 'Building 2',
      powers: [
        'Course retakes, prerequisite waivers & drop/add approvals',
        'Section capacity & lab assignment adjustments',
        'Routine clash resolutions & CR supervision',
      ],
    },
    proctor: {
      name: 'Ali Azgar',
      designation: 'Assistant Professor & Assistant Proctor (CSE)',
      facultyId: '5cc3ff85-b7c7-4be1-a0d9-04fd8e97dea4',
      email: 'azgar@bubt.edu.bd',
      powers: [
        'Student conduct, campus discipline & dispute settlement',
        'Harassment, bullying & anti-ragging complaints',
        'Lost or confiscated student ID card clearances',
      ],
    },
    dean: DEAN_ENGINEERING,
  },

  // EEE
  '35': {
    chairman: {
      name: 'Prof. Dr. Ahmed Al Mansur',
      designation: 'Professor & Chairman',
      facultyId: '0c995514-a37d-4808-bd7d-a23317bf6e0e',
      email: 'mansur.eee@bubt.edu.bd',
      room: '405',
      building: 'Building 2',
      powers: [
        'Course retakes, prerequisite waivers & lab allocations',
        'Section adjustments & routine clash resolutions',
        'Project supervisor & major specialization approvals',
      ],
    },
    proctor: {
      name: 'Mohammad Jahidul Islam',
      designation: 'Assistant Professor & Assistant Proctor (EEE)',
      facultyId: 'e13bc218-7ee1-45a4-8850-08935daad08b',
      email: 'jahidulislam@bubt.edu.bd',
      powers: [
        'Student conduct, lab safety & dispute settlement',
        'Harassment, bullying & disciplinary complaints',
        'Campus security & student ID clearances',
      ],
    },
    dean: DEAN_ENGINEERING,
  },

  // Civil
  '37': {
    chairman: {
      name: 'Prof. Dr. Syed Abdul Mofiz',
      designation: 'Professor & Chairman',
      facultyId: '9fd7e2ec-1f41-44f5-aca8-1f3882a716e7',
      email: 'samofiz@gmail.com',
      room: '501',
      building: 'Building 3',
      powers: [
        'Course waivers, retakes, lab approvals & field study permissions',
        'Section adjustments & routine conflict resolutions',
      ],
    },
    proctor: PROCTOR_CENTRAL,
    dean: DEAN_ENGINEERING,
  },

  // Textile
  '36': {
    chairman: {
      name: 'Mohammad Mahmudur Rahman Khan',
      designation: 'Assistant Professor & Chairman',
      facultyId: 'fe610497-0534-4dfe-ac28-649b30c099ea',
      email: 'mahmud.r@bubt.edu.bd',
      room: '402',
      building: 'Building 3',
      powers: [
        'Course retakes, industrial attachment waivers & lab permissions',
        'Section capacity & routine approvals',
      ],
    },
    proctor: PROCTOR_CENTRAL,
    dean: DEAN_ENGINEERING,
  },

  // Data Science
  '39': {
    chairman: {
      name: 'Dr. Md. Rajibul Islam',
      designation: 'Associate Professor & Chairman',
      facultyId: '66c78758-4cc4-4577-a788-39107ef46658',
      email: 'md.rajibul.islam@bubt.edu.bd',
      powers: [
        'Curriculum advising, course waivers, retakes & routine approvals',
        'Section capacity & special lab access',
      ],
    },
    proctor: {
      name: 'Ali Azgar',
      designation: 'Assistant Professor & Assistant Proctor (Engineering)',
      facultyId: '5cc3ff85-b7c7-4be1-a0d9-04fd8e97dea4',
      email: 'azgar@bubt.edu.bd',
      powers: [
        'Student conduct, campus discipline & dispute settlement',
        'Harassment, bullying & anti-ragging complaints',
      ],
    },
    dean: DEAN_ENGINEERING,
  },

  // Management
  '26': {
    chairman: {
      name: 'Thawhidul Kabir',
      designation: 'Assistant Professor & Chairman',
      facultyId: '6c57ba55-af09-4100-af50-5116af2d4434',
      email: 'thawhidul.k@bubt.edu.bd',
      room: '201',
      building: 'Building 4',
      powers: [
        'BBA course retakes, prerequisite waivers & major declarations',
        'Section changes, internship approvals & routine clash fixes',
      ],
    },
    proctor: {
      name: 'Sharmin Sultana',
      designation: 'Assistant Professor & Assistant Proctor (Business)',
      facultyId: '9862fe4f-8ec8-428d-a81b-938bd956b057',
      email: 'bubt.sharmin@gmail.com',
      powers: [
        'Student conduct, anti-harassment, safety & dispute resolution',
        'Confiscated or lost student ID card verification',
      ],
    },
    dean: DEAN_BUSINESS,
  },

  // Accounting
  '32': {
    chairman: {
      name: 'Dr. Kazi Naeema Binte Faruky',
      designation: 'Associate Professor & Chairman',
      facultyId: 'b7182cc0-d24c-455a-a914-79b247432e62',
      email: 'naeema@bubt.edu.bd',
      powers: [
        'Major declaration, course retakes, prerequisite waivers & section adjustments',
        'Routine clash resolutions & internship sign-offs',
      ],
    },
    proctor: {
      name: 'Sharmin Sultana',
      designation: 'Assistant Professor & Assistant Proctor (Business)',
      facultyId: '9862fe4f-8ec8-428d-a81b-938bd956b057',
      email: 'bubt.sharmin@gmail.com',
      powers: [
        'Student conduct, anti-harassment, safety & dispute resolution',
        'Confiscated or lost student ID card verification',
      ],
    },
    dean: DEAN_BUSINESS,
  },

  // Marketing
  '33': {
    chairman: {
      name: 'Omar Faruck Ansari',
      designation: 'Assistant Professor & Chairman',
      facultyId: 'b4cb5787-2ce3-428f-81f7-cbdb36878577',
      email: 'omar14ansari@gmail.com',
      powers: [
        'Course waivers, retakes, section changes & internship permissions',
        'Major declarations & routine clash fixes',
      ],
    },
    proctor: {
      name: 'Sharmin Sultana',
      designation: 'Assistant Professor & Assistant Proctor (Business)',
      facultyId: '9862fe4f-8ec8-428d-a81b-938bd956b057',
      email: 'bubt.sharmin@gmail.com',
      powers: [
        'Student conduct, anti-harassment & dispute resolution',
      ],
    },
    dean: DEAN_BUSINESS,
  },

  // Finance
  '34': {
    chairman: {
      name: 'Md. Sayeem Bin Hafiz',
      designation: 'Assistant Professor & Chairman',
      facultyId: 'd80bbb52-1ca1-4f68-8099-340777390eaa',
      email: 'hafiz@bubt.edu.bd',
      powers: [
        'Course waivers, retake permissions, section swaps & internship letters',
        'Major declarations & routine clash fixes',
      ],
    },
    proctor: {
      name: 'Sharmin Sultana',
      designation: 'Assistant Professor & Assistant Proctor (Business)',
      facultyId: '9862fe4f-8ec8-428d-a81b-938bd956b057',
      email: 'bubt.sharmin@gmail.com',
      powers: [
        'Student conduct, anti-harassment & dispute resolution',
      ],
    },
    dean: DEAN_BUSINESS,
  },

  // English
  '30': {
    chairman: {
      name: 'Md. Reza Hassan Khan',
      designation: 'Assistant Professor & Chairman',
      facultyId: 'bc0395d5-0d8f-4a08-9921-8c0d1c14af47',
      email: 'reza@bubt.edu.bd',
      room: '401',
      building: 'Building 1',
      powers: [
        'Course waivers, retake permissions, language lab approvals & section capacity',
        'Routine approvals & CR supervision',
      ],
    },
    proctor: {
      name: 'Md. Solaiman Alam',
      designation: 'Assistant Professor & Assistant Proctor (English)',
      facultyId: 'e2e25439-90da-4cfc-b74d-c0368e953851',
      email: 'ocean1288@yahoo.com',
      powers: [
        'Student conduct, campus discipline, harassment reports & dispute resolution',
        'Lost or confiscated student ID card clearances',
      ],
    },
    dean: DEAN_ARTS,
  },

  // Law
  '29': {
    chairman: {
      name: 'Ariful Islam',
      designation: 'Assistant Professor & Chairman',
      facultyId: 'ce4e3e46-fdc3-4503-96f6-c462de970313',
      email: 'ariflaw.iu@gmail.com',
      powers: [
        'Moot court permissions, course retakes, prerequisite waivers & section swaps',
        'Legal apprenticeship sign-offs & routine approvals',
      ],
    },
    proctor: PROCTOR_CENTRAL,
    dean: DEAN_LAW,
  },

  // Economics
  '31': {
    chairman: {
      name: 'Md. Mahmudul Hassan',
      designation: 'Professor & Chairman',
      facultyId: '39d245f0-58dd-44f7-9c9d-4394036e8fbb',
      email: 'masudulhasan@bubt.edu.bd',
      powers: [
        'Course retakes, prerequisite waivers, major advising & section adjustments',
        'Routine clash resolutions & project sign-offs',
      ],
    },
    proctor: PROCTOR_CENTRAL,
    dean: DEAN_BUSINESS,
  },

  // Mathematics & Statistics
  '28': {
    chairman: {
      name: 'Dr. Md. Abdul Hye',
      designation: 'Associate Professor & Chairman',
      facultyId: 'ab84655e-7f05-4e99-8095-d5ad2e81a8db',
      email: 'abdul@bubt.edu.bd',
      room: '502',
      building: 'Building 2',
      powers: [
        'Fundamental science course waivers, retake permissions & section capacity',
        'Routine conflict resolutions & laboratory access',
      ],
    },
    proctor: PROCTOR_CENTRAL,
    dean: DEAN_ENGINEERING,
  },
};

/**
 * Returns the 3 key decision-makers for a given department:
 * 1. Chairman
 * 2. Assistant Proctor (or Chief Proctor)
 * 3. Faculty Dean
 *
 * Automatically enriches records with active data from the department roster
 * (photoUrl, phone, room, counselingHours, etc.).
 */
export function getDepartmentAuthorities(
  deptNumber: string | null | undefined,
  deptName?: string | null,
  deptChairmanName?: string | null,
  roster: Array<{
    id: string;
    name: string;
    designation: string;
    photo_url?: string | null;
    email?: string | null;
    phone?: string | null;
    cell_phone?: string | null;
    room_number?: string | null;
    building?: string | null;
    counseling_hours?: string | null;
    is_chairman?: boolean;
  }> = []
): DepartmentAuthority[] {
  const num = (deptNumber || '').trim();
  const config = DEPARTMENT_AUTHORITIES_CONFIG[num];

  const authorities: DepartmentAuthority[] = [];

  // 1. Chairman
  const chairFromRoster = roster.find(f => f.is_chairman)
    || (deptChairmanName ? roster.find(f => f.name.toLowerCase().includes(deptChairmanName.split('(')[0].trim().toLowerCase())) : null);

  const chairName = chairFromRoster?.name
    || config?.chairman?.name
    || (deptChairmanName ? deptChairmanName.split('(')[0].trim() : 'Department Chairman');

  authorities.push({
    roleType: 'chairman',
    roleTitle: 'Department Chairman',
    badgeLabel: 'Chairman',
    name: chairName,
    designation: chairFromRoster?.designation || config?.chairman?.designation || 'Chairman of the Department',
    facultyId: chairFromRoster?.id || config?.chairman?.facultyId,
    photoUrl: chairFromRoster?.photo_url || null,
    email: chairFromRoster?.email || config?.chairman?.email || null,
    phone: chairFromRoster?.cell_phone || chairFromRoster?.phone || null,
    room: chairFromRoster?.room_number || config?.chairman?.room || null,
    building: chairFromRoster?.building || config?.chairman?.building || null,
    counselingHours: chairFromRoster?.counseling_hours || null,
    powers: config?.chairman?.powers || [
      'Course retakes, prerequisite waivers & drop/add approvals',
      'Section capacity & routine clash adjustments',
      'Departmental academic permissions & CR supervision',
    ],
  });

  // 2. Assistant Proctor / Proctorial Body
  const proctorCfg = config?.proctor || PROCTOR_CENTRAL;
  const proctorFromRoster = proctorCfg.facultyId ? roster.find(f => f.id === proctorCfg.facultyId) : null;

  authorities.push({
    roleType: 'proctor',
    roleTitle: proctorCfg.facultyId ? 'Assistant Proctor' : 'Office of the Proctor',
    badgeLabel: proctorCfg.facultyId ? 'Asst. Proctor' : 'Proctorial Body',
    name: proctorFromRoster?.name || proctorCfg.name,
    designation: proctorFromRoster?.designation || proctorCfg.designation,
    facultyId: proctorFromRoster?.id || proctorCfg.facultyId || null,
    photoUrl: proctorFromRoster?.photo_url || null,
    email: proctorFromRoster?.email || proctorCfg.email || null,
    phone: proctorFromRoster?.cell_phone || proctorFromRoster?.phone || null,
    room: proctorFromRoster?.room_number || proctorCfg.room || null,
    building: proctorFromRoster?.building || proctorCfg.building || null,
    counselingHours: proctorFromRoster?.counseling_hours || null,
    powers: proctorCfg.powers,
  });

  // 3. Faculty Dean
  const deanCfg = config?.dean || DEAN_ENGINEERING;
  const deanFromRoster = deanCfg.facultyId ? roster.find(f => f.id === deanCfg.facultyId) : null;

  authorities.push({
    roleType: 'dean',
    roleTitle: 'Faculty Dean',
    badgeLabel: 'Faculty Dean',
    name: deanFromRoster?.name || deanCfg.name,
    designation: deanFromRoster?.designation || deanCfg.designation,
    facultyId: deanFromRoster?.id || deanCfg.facultyId || null,
    photoUrl: deanFromRoster?.photo_url || null,
    email: deanFromRoster?.email || deanCfg.email || null,
    phone: deanFromRoster?.cell_phone || deanFromRoster?.phone || null,
    room: deanFromRoster?.room_number || deanCfg.room || null,
    building: deanFromRoster?.building || deanCfg.building || null,
    counselingHours: deanFromRoster?.counseling_hours || null,
    powers: deanCfg.powers,
  });

  return authorities;
}
