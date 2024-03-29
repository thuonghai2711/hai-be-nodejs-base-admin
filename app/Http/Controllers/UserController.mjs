import BaseController from "./BaseController.mjs";
import { responseSuccess, responseErrors } from "../../Common/helper.mjs";
import UserRepository from "../../Repositories/UserRepository.mjs";
import * as XLSX from 'xlsx/xlsx.mjs';
import * as fs from 'fs';
import UserService from "../../Services/UserService.mjs";
import { STORAGE_PATHS, USER_IMPORTS, USERS } from "../../../config/common.mjs";
import UserImportRepository from "../../Repositories/UserImportRepository.mjs";
import ImportUsers from "../Jobs/ImportUsers.mjs";
XLSX.set_fs(fs);

class UserController extends BaseController
{
    index(req, res)
    {
        try {
            UserRepository.paginate(req.query, {
                page: +req.query?.pagination?.page,
                limit: +req.query?.pagination?.limit
            }).then(
                (users) => {
                    return responseSuccess(res, users);
                }
            )
        } catch (e) {

            return responseErrors(res, 400, e.message);
        }
    }

    store(req, res)
    {
        try {
            const params = req.body;
            UserService.storeUser(params).then(
                (response) => {
                    if (response.isSuccess) {
                        return responseSuccess(res, response.user, 201);
                    }

                    return responseErrors(res, 400, response.error.message);
                }
            );


        } catch (e) {
            return responseErrors(res, 400, e.message);
        }
    }

    show(req, res)
    {
        try {
            UserRepository.findById(req.params.userId).then(
                (user) => {
                    return responseSuccess(res, user);
                }
            )
        } catch (e) {
            return responseErrors(res, 400, e.message);
        }
    }

    update(req, res)
    {
        try {
            UserRepository.update(req.params.userId, req.body).then(
                (user) => {
                    return responseSuccess(res, true);
                }
            );

        } catch (e) {
            return responseErrors(res, 400, e.message);
        }
    }

    destroy(req, res)
    {
        try {
            UserRepository.delete(req.params.userId).then(
                (user) => {
                    return responseSuccess(res, true);
                }
            );

        } catch (e) {
            return responseErrors(res, 400, e.message);
        }
    }

    async import(req, res)
    {
        try {
            const wb = XLSX.readFile(req.file.path);
            const users = XLSX.utils.sheet_to_json(
                wb.Sheets[wb.SheetNames[0]],
                {
                    header:['name', 'phone', 'email'],
                    range:1
                }
            )

            if (!users.length) {
                return responseErrors(res, 422, 'Danh sách users trống');
            }
            const storeUserImport = await UserImportRepository.store({
                path: STORAGE_PATHS.importUsers + req.file.filename,
            })
            ImportUsers.handle(users, storeUserImport);

            return responseSuccess(res, {}, 200);
        } catch (e) {
            return responseErrors(res, 400, e.message);
        }
    }

    showImportNewest(req, res)
    {
        try {
            UserImportRepository.showNewest().then(
                (userImport) => {
                    return responseSuccess(res, userImport, 200);
                }
            );
        } catch (e) {
            return responseErrors(res, 400, e.message);
        }
    }

    getImportHistory(req, res)
    {
        try {
            UserImportRepository.findBy({}, {
                created_at: -1
            }).then(
                (userImports) => {
                    userImports = JSON.parse(JSON.stringify(userImports)).map(
                        userImport => {
                            try {
                                const wb = XLSX.readFile(userImport.path);
                                userImport.file = XLSX.write(wb, {
                                    type: "buffer",
                                    bookType: "xlsx"
                                });
                            } catch (e) {
                                userImport.file = null;
                            }

                            return userImport;
                        }
                    );

                    return responseSuccess(res, userImports, 200);
                }
            );
        } catch (e) {
            return responseErrors(res, 400, e.message);
        }
    }

    async export(req, res)
    {
        try {
            let users = await UserRepository.findBy(req.body);
            users = users.map(
                user => [user.name, user.email, user.phone]
            );
            const ws = XLSX.utils.aoa_to_sheet([['name', 'email', 'phone'], ...users]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data");
            const buf = XLSX.write(wb, {
                type: "buffer",
                bookType: "xlsx"
            });

            return responseSuccess(res, buf);
        } catch (e) {

            return responseErrors(res, 400, e.message);
        }
    }}

export default new UserController();