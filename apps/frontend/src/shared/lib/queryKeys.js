export const queryKeys = {
    surat: {
        all: ['surat'],
        list: (filters) => ['surat', 'list', filters],
        detail: (id) => ['surat', 'detail', id],
    },
    kependudukan: {
       citizens: {
        list: (filters) => ['kependudukan', 'citizens', filters],
        detail: (id) => ['kependudukan', 'citizens', id],
       },
       families: {
        list: (filters) => ['kependudukan', 'families', filters],
        detail: (id) => ['kependudukan', 'families', id],
       },
    },
    cms: {
        news: ['cms', 'news'],
        regulations: ['cms', 'regulations'],
        profile: ['cms', 'profile'],
    },
    adminConfig: {
        wilayah: ['adminConfig', 'wilayah'],
        jabatan: ['adminConfig', 'jabatan'],
        letterTypes: ['adminConfig', 'letterTypes'],
    },
};