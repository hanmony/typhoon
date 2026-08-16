import { StaffDocument } from "src/database/entity/staff.schema";

export class UserDataDto {
    id: string = "";
    name: string = "";
    roles: string[] = [];
    department: string = "";
    job: string = "";
    line: string = "";

    static fromDoc(doc: StaffDocument): UserDataDto {
        const ret = new UserDataDto();
        ret.id = doc.username;
        ret.name = doc.nickname;
        ret.roles = doc.roles;
        ret.department = doc.department;
        ret.job = doc.job;
        ret.line = doc.line;
        return ret;
    }
}
