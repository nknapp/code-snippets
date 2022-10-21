import { get as idbGet, set as idbSet, update as idbUpdate } from "idb-keyval";
import {rest, RestHandler} from "msw";

let counter = 0;
export function generateId(): number {
    return counter++;
}

class InternalTusFile {
    private readonly id: string;
    private readonly idbDataKey: string;
    private readonly idbOffsetKey: string;

    constructor(id: string) {
        this.id = id;
        this.idbDataKey = "gachou-image-data-" + this.id;
        this.idbOffsetKey = "gachou-image-offset-" + this.id;
    }

    async create(byteLength: number): Promise<void> {
        await Promise.all([
            idbSet(this.idbDataKey, new ArrayBuffer(byteLength)),
            idbSet(this.idbOffsetKey, 0),
        ]);
    }

    async update(offsetBytes: number, bytes: ArrayBuffer): Promise<void> {
        await idbUpdate(this.idbDataKey, (value) => {
            if (value == null || !(value instanceof ArrayBuffer)) {
                throw new Error("file does not exist: " + this.id);
            }
            const buffer = value as ArrayBuffer;
            const view = new Uint8Array(buffer);
            view.set(new Uint8Array(bytes), offsetBytes);
            return buffer;
        });
        await idbSet(this.idbOffsetKey, offsetBytes + bytes.byteLength);
    }

    async getUploadOffset(): Promise<number> {
        const result = await idbGet(this.idbOffsetKey);
        if (result == null) {
            throw new Error("Cannot find file by id " + this.id);
        }
        return result;
    }

    async getUploadLength(): Promise<number> {
        const result = await idbGet<ArrayBuffer>(this.idbDataKey);
        if (result == null) {
            throw new Error("Cannot find file by id " + this.id);
        }
        return result.byteLength;
    }

    async exists() {
        return (await idbGet(this.idbOffsetKey)) != null;
    }

    async body() {
        const data = await idbGet(this.idbDataKey);
        return data ? new Uint8Array(data) : new Uint8Array(0);
    }
}

export function createTusHandlers(): RestHandler[] {
    return [
        rest.post("/files/", async (req, res, context) => {
            const id = Date.now() + "-" + generateId();
            const uploadLengthHeader = req.headers.get("Upload-Length");
            if (uploadLengthHeader == null) {
                return res(
                    context.status(400),
                    context.text("Upload-Length header required")
                );
            }
            const uploadLength = parseInt(uploadLengthHeader);

            await new InternalTusFile(id).create(uploadLength);
            return res(
                context.status(201),
                context.set("Location", "/files/" + id),
                context.set("Tus-Resumable", "1.0.0"),
                context.set("Tus-Extension", "creation")
            );
        }),
        rest.head("/files/:id", async (req, res, context) => {
            const id = req.params.id as string;
            const file = new InternalTusFile(id);
            if (!(await file.exists())) {
                return res(context.status(404));
            }
            return res(
                context.set("Upload-Length", String(await file.getUploadLength())),
                context.set("Upload-Offset", String(await file.getUploadOffset()))
            );
        }),
        rest.patch("/files/:id", async (req, res, context) => {
            const id = req.params.id as string;
            const file = new InternalTusFile(id);
            if (!(await file.exists())) {
                return res(context.status(404));
            }

            const offsetBytes = parseInt(req.headers.get("Upload-Offset") ?? "0");

            if ((await file.getUploadOffset()) !== offsetBytes) {
                return res(context.status(409));
            }

            const bodyBytes = await req.arrayBuffer();
            try {
                await file.update(offsetBytes, bodyBytes);
            } catch (e) {
                return res(
                    context.set("content-type", "image/png"),
                    context.body(new Blob([await file.body()]))
                );
            }

            return res(
                context.status(204),
                context.delay(1),
                context.set("Upload-Offset", String(await file.getUploadOffset()))
            );
        }),
    ];
}
