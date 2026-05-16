const DEVICE_ID_KEY = 'survivors_device_id';

export class Identity {
    static getDeviceId(): string {
        let id = localStorage.getItem(DEVICE_ID_KEY);
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem(DEVICE_ID_KEY, id);
        }
        return id;
    }
}
