export const APPROVAL_FLOW = [
  'pending',
  'rt_approved',
  'rw_approved',
  'kadus_approved',
  'kasi_approved',
];


export const STATUS_BADGE = {

  pending:{
    label:'Menunggu RT',
    className:'bg-yellow-100 text-yellow-700'
  },


  rt_approved:{
    label:'RT Disetujui',
    className:'bg-green-100 text-green-700'
  },

  rt_rejected:{
    label:'RT Ditolak',
    className:'bg-red-100 text-red-700'
  },


  rw_approved:{
    label:'RW Disetujui',
    className:'bg-green-100 text-green-700'
  },

  rw_rejected:{
    label:'RW Ditolak',
    className:'bg-red-100 text-red-700'
  },


  kadus_approved:{
    label:'Kadus Disetujui',
    className:'bg-green-100 text-green-700'
  },


  kadus_rejected:{
    label:'Kadus Ditolak',
    className:'bg-red-100 text-red-700'
  },


  kasi_approved:{
    label:'Selesai',
    className:'bg-emerald-100 text-emerald-700'
  },


  kasi_rejected:{
    label:'Kasi Ditolak',
    className:'bg-red-100 text-red-700'
  },

};




export const STEP_LABELS=[
  'Submit',
  'RT',
  'RW',
  'Kadus',
  'Kasi'
];





export function getStepIndex(status){


  const map={

    pending:0,


    rt_approved:1,
    rt_rejected:1,


    rw_approved:2,
    rw_rejected:2,


    kadus_approved:3,
    kadus_rejected:3,


    kasi_approved:4,
    kasi_rejected:4,

  };


  return map[status] ?? 0;

}





export function getStepStatuses(surat){


  const status = surat.status;



  return [

    {
      label:'Submit',
      state:'done',
      timestamp:
        surat.created_at ?? null
    },


    {
      label:'RT',

      state:

        status === 'rt_rejected'
        ? 'rejected'

        :
        [
          'rt_approved',
          'rw_approved',
          'rw_rejected',
          'kadus_approved',
          'kadus_rejected',
          'kasi_approved',
          'kasi_rejected'
        ].includes(status)

        ? 'done'

        :

        'current',


      timestamp:null

    },



    {
      label:'RW',

      state:

        status === 'rw_rejected'
        ? 'rejected'

        :

        [
          'rw_approved',
          'kadus_approved',
          'kadus_rejected',
          'kasi_approved',
          'kasi_rejected'
        ].includes(status)

        ? 'done'

        :

        status === 'rt_approved'
        ? 'current'

        :
        'waiting',

      timestamp:null
    },





    {
      label:'Kadus',

      state:

        status === 'kadus_rejected'
        ? 'rejected'

        :

        [
          'kadus_approved',
          'kasi_approved',
          'kasi_rejected'
        ].includes(status)

        ? 'done'

        :

        status === 'rw_approved'
        ? 'current'

        :
        'waiting',


      timestamp:null

    },





    {
      label:'Kasi',

      state:

        status === 'kasi_rejected'
        ? 'rejected'

        :

        status === 'kasi_approved'
        ? 'done'

        :

        status === 'kadus_approved'
        ? 'current'

        :
        'waiting',


      timestamp:null

    }


  ];


}