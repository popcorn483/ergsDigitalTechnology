/* Mr B's Digital Technology Revision: where pupil data lives.
   Pupil sign-ins, progress, activity, classes, set work, tests and competitions are kept in the Firebase project
   ergs-revision (Cloud Firestore, London, free Spark plan). See tools/FIREBASE.md.
   apiUrl is only an internal address: fbapi.js answers every request to it in the browser. activity.json points at it.
   legacyUrl is the old Google Apps Script (tools/pupil-activity.gs). It still checks a pupil's old PIN the first time they
   sign in after the move, and still sends emails (new PINs, the staff details, a test email).
   USE_FIREBASE: true = Firebase, false = straight back to the Google Sheet (every request is passed to the old script).
   Add ?fb=0 or ?fb=1 to any page's address to switch one device only (remembered on that device). */
(function () {
  var USE_FIREBASE = true;
  var on = USE_FIREBASE;
  try {
    var m = /[?&]fb=([01])/.exec(location.search);
    if (m) localStorage.setItem('mrb-fb', m[1]);
    var v = localStorage.getItem('mrb-fb'); if (v === '1') on = true; else if (v === '0') on = false;
  } catch (e) { }
  window.MRB_FB = {
    on: on,
    apiUrl: 'https://ergs-revision.firebaseapp.com/__mrb_api',
    legacyUrl: 'https://script.google.com/macros/s/AKfycbxVqMtp2H5dlHN8rAvt9rG596NI9dqCR2pi3-b7h-v850aLcqPGcgcq2Wwpr4BEOAhYlQ/exec',
    firebase: {
      apiKey: 'AIzaSyCFAHp-CHcBpAN90-4P1Uaa72sRPxHw38w',
      authDomain: 'ergs-revision.firebaseapp.com',
      projectId: 'ergs-revision',
      storageBucket: 'ergs-revision.firebasestorage.app',
      messagingSenderId: '125491834566',
      appId: '1:125491834566:web:27ff95cdb17729d6c131c7'
    },
    /* Google accounts that own the Teacher area (more staff: Teacher area › Pupils › Make teacher, or a Firestore "staff" document) */
    owners: ['jbutler483@gmail.com', 'jbutler803@c2ken.net']
  };
})();
