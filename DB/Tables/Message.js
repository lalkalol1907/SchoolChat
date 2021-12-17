const { Message, sequelize, ERR, OK, PH, EM, NAME, PR, initialize, DATA } = require('../DB_init.js');
const { data_checker, propper, check_exist, is_Admin, msg_checker } = require('../DB_functions.js');

async function new_msg(data) {
    /**
     * data = {chat_id, user_id, text, attachments = {}}
     */
    if (!data_checker(data, ["chat_id", "user_id"]) || ((data.attachments == undefined || data.attachments == {}) && data.text == undefined))
        return DATA;
    data = propper(data, ["text"]);
    if (!(await check_exist({ id: data.user_id }, "user")) || !(await check_exist({ id: data.chat_id }, "chat")))
        return DATA;
    data.attachments = data.attachments == undefined ? {} : data.attachments;
    data.text = msg_checker(data.text);
    if (data.text == "" || data.text == undefined)
        return DATA;
    const new_message = await Message.create({
        chat_id: data.chat_id,
        user_id: data.user_id,
        text: data.text,
        attachments: data.attachments
    });
    await new_message.save();
    return OK;
}



async function get_msgs_for_user(data) {
    /**
     * data = {chat_id, user_id}
     */
    msgs = get_all_showing_msgs(data.chat_id);
    for (let i = 0; i < msgs.length; i++)
        if ((msgs[i].user_id == data.user_id) && (msgs[i].deleted_user == true))
            msgs.splice(i, 1);
    return msgs;
}

async function get_all_showing_msgs(data) {
    /**
     * data = {chat_id}
     */
    let msgs = await get_all_chat_msgs(data);
    for (let i = 0; i < msgs.length; i++)
        if (msgs[i].deleted_all == true)
            msgs.splice(i, 1);
    console.log("all_msgs")
    console.log(msgs)
    return msgs;
}

async function get_all_chat_msgs(data) {
    /**
    * data = {chat_id}
    */
    console.log(data)
    if (!data_checker(data, ["chat_id"]))
        return DATA;
    if (!(await check_exist({ id: data.chat_id }, "chat")))
        return DATA;
    let msgs = await Message.findAll({
        raw: true,
        where: {
            chat_id: parseInt(data.chat_id)
        }
    });
    return msgs;
}

async function get_last_message(data) {
    let msgs = await get_all_showing_msgs(data)
    return msgs[msgs.length - 1]
}

async function manage_msgs(data, flag) {
    /**
     * data = {msg_id, text, requester_id, attachments}
     */
    if (!data_checker(data, ["msg_id"]))
        return DATA;
    switch (flag) {
        case "delete_all":
            if (!data_checker(data, ["requester_id"]))
                return DATA;
            if ((await is_Admin({ chat_id: (await Message.findAll({
                raw: true,
                attributes: ["chat_id"], 
                where: { id: data.msg_id } }))[0].chat_id, user_id: data.requester_id }))
                || (await Message.findAll({
                    raw: true, where: {
                        id: data.msg_id,
                        user_id: data.requester_id
                    }
                })).length != 0) {
                await Message.update({ deleted_all: true }, {
                    where: {
                        id: data.msg_id,
                    }
                })
                return OK;
            }
            return PR;
        case "delete_one":
            await Message.update({ deleted_user: true }, {
                where: {
                    id: data.msg_id,
                }
            });
            return OK;
        case "edit":
            if (!data_checker(data, ["requester_id"]) || ((data.attachments == undefined || data.attachments == {}) && (data.text == undefined || data.text == "")))
                return DATA;
            data = propper(data, ["text"]);
            data.attachments = data.attachments == undefined ? {} : data.attachments;
            if ((await Message.findAll({raw: true, where: {
                id: data.msg_id,
                user_id: data.requester_id
            }})).length == 0)
                return PR;
            data.text = msg_checker(data.text);
            if (data.text == "" || data.text == undefined)
                return DATA;
            await Message.update({
                text: data.text,
                attachments: data.attachments
            }, {
                where: {
                    id: data.msg_id
                }
            });
            return OK;
    }
}

async function get_last_id() {
    let msgs = await Message.findAll({
        raw: true,
    });
    console.log(msgs[msgs.length - 1].id)
    return msgs[msgs.length - 1].id
}

module.exports = {
    new_msg, get_msgs_for_user, get_all_showing_msgs, get_all_chat_msgs, manage_msgs, get_last_message, get_last_id
}