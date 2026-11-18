import { ref, watch } from 'vue';

const STORAGE_KEY = 'locale';

export const locale = ref(localStorage.getItem(STORAGE_KEY) || 'ar');

watch(locale, (val) => localStorage.setItem(STORAGE_KEY, val));

export function toggleLocale() {
    locale.value = locale.value === 'ar' ? 'en' : 'ar';
}

const messages = {
    ar: {
        common: { brand: 'نظام تعديل الأسعار', logout: 'تسجيل الخروج', none: '—' },
        login: {
            title: 'تسجيل الدخول',
            number: 'الرقم الوظيفي',
            submit: 'دخول',
            error: 'فشل تسجيل الدخول',
        },
        requestsList: {
            title: 'طلباتي لتعديل الأسعار',
            newRequest: 'طلب جديد',
            loading: 'جارِ التحميل...',
            empty: 'لا توجد طلبات بعد',
            errorLoad: 'فشل تحميل الطلبات',
            material: 'المادة',
            currentPrice: 'السعر الحالي',
            requestedPrice: 'السعر المطلوب',
            status: 'الحالة',
            stage: 'المرحلة',
            view: 'عرض',
            notes: 'ملاحظات',
            approvedPrice: 'السعر المعتمد',
            save: 'حفظ',
            cancel: 'إلغاء',
            errorSubmit: 'فشل إرسال الطلب',
            errorValidation: 'يرجى تعبئة كل الحقول',
            branchUpdatesTitle: 'مواد مطلوب تعديل سعرها في الواقع',
            branchUpdatesEmpty: 'لا توجد مواد بانتظار التعديل',
            branchUpdatesErrorLoad: 'فشل تحميل المواد المطلوب تعديلها',
            branchUpdatesErrorConfirm: 'فشل تأكيد التعديل',
            confirmUpdate: 'تم التعديل',
        },
        requestForm: {
            title: 'طلب جديد',
            material: 'المادة',
            currentPrice: 'السعر الحالي',
            requestedPrice: 'السعر المطلوب',
            notes: 'ملاحظات (اختياري)',
            submit: 'إرسال',
            errorSubmit: 'فشل إرسال الطلب',
        },
        requestDetail: {
            loading: 'جارِ التحميل...',
            errorLoad: 'فشل تحميل الطلب',
            material: 'المادة',
            currentPrice: 'السعر الحالي',
            requestedPrice: 'السعر المطلوب',
            approvedPrice: 'السعر المعتمد',
            status: 'الحالة',
            stage: 'المرحلة',
            notes: 'ملاحظات',
            none: '—',
        },
        status: {
            'Under Review': 'قيد المراجعة',
            Approved: 'مقبول',
            'Approved with Modification': 'مقبول مع تعديل',
            Rejected: 'مرفوض',
        },
        stage: {
            Received: 'تم الاستلام',
            Reviewed: 'تمت المراجعة',
            'Pending Execution': 'بانتظار التعديل',
            Completed: 'اكتمل',
        },
    },
    en: {
        common: { brand: 'Price Update System', logout: 'Log out', none: '—' },
        login: {
            title: 'Sign in',
            number: 'Employee Number',
            submit: 'Log in',
            error: 'Login failed',
        },
        requestsList: {
            title: 'My Requests to Edit Price',
            newRequest: 'New Request',
            loading: 'Loading...',
            empty: 'No requests yet',
            errorLoad: 'Failed to load requests',
            material: 'Material',
            currentPrice: 'Current Price',
            requestedPrice: 'Requested Price',
            status: 'Status',
            stage: 'Stage',
            view: 'View',
            notes: 'Notes',
            approvedPrice: 'Approved Price',
            save: 'Save',
            cancel: 'Cancel',
            errorSubmit: 'Failed to submit request',
            errorValidation: 'Please fill in all fields',
            branchUpdatesTitle: 'Materials Requiring Price Update',
            branchUpdatesEmpty: 'No materials pending update',
            branchUpdatesErrorLoad: 'Failed to load pending materials',
            branchUpdatesErrorConfirm: 'Failed to confirm update',
            confirmUpdate: 'Mark as Updated',
        },
        requestForm: {
            title: 'New Request',
            material: 'Material',
            currentPrice: 'Current Price',
            requestedPrice: 'Requested Price',
            notes: 'Notes (optional)',
            submit: 'Submit',
            errorSubmit: 'Failed to submit request',
        },
        requestDetail: {
            loading: 'Loading...',
            errorLoad: 'Failed to load request',
            material: 'Material',
            currentPrice: 'Current Price',
            requestedPrice: 'Requested Price',
            approvedPrice: 'Approved Price',
            status: 'Status',
            stage: 'Stage',
            notes: 'Notes',
            none: '—',
        },
        status: {
            'Under Review': 'Under Review',
            Approved: 'Approved',
            'Approved with Modification': 'Approved with Modification',
            Rejected: 'Rejected',
        },
        stage: {
            Received: 'Received',
            Reviewed: 'Reviewed',
            'Pending Execution': 'Pending Execution',
            Completed: 'Completed',
        },
    },
};

export function t(key) {
    const value = key.split('.').reduce((obj, part) => obj?.[part], messages[locale.value]);
    return value ?? key;
}

export function statusLabel(status) {
    return messages[locale.value].status[status] ?? status;
}

export function stageLabel(stage) {
    return messages[locale.value].stage[stage] ?? stage;
}

