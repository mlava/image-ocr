import { createWorker } from 'tesseract.js';
import iziToast from "izitoast";

export default {
    onload: ({ extensionAPI }) => {
        const config = {
            tabTitle: "Image OCR",
            settings: [
                {
                    id: "io-language",
                    name: "Language Code",
                    description: "Language Code",
                    action: { type: "select", items: ["afr", "amh", "ara", "asm", "aze", "aze_cyrl", "bel", "ben", "bod", "bos", "bul", "cat", "ceb", "ces", "chi_sim", "chi_tra", "chr", "cym", "dan", "deu", "dzo", "ell", "eng", "enm", "epo", "est", "eus", "fao", "fas", "fin", "fra", "frk", "frm", "gle", "glg", "grc", "guj", "hat", "heb", "hin", "hrv", "hun", "iku", "ind", "isl", "ita", "ita_old", "jav", "jpn", "kan", "kat", "kat_old", "kaz", "khm", "kir", "kor", "kur", "lao", "lat", "lav", "lit", "mal", "mar", "mkd", "mlt", "msa", "mya", "nep", "nld", "nor", "oci", "ori", "pan", "pol", "por", "pus", "ron", "rus", "san", "sin", "slk", "slv", "snd", "spa", "sqi", "srp", "srp_latn", "swah", "swe", "syr", "tam", "tel", "tgk", "tgl", "tha", "tir", "ton", "tur", "uig", "ukr", "urd", "uzb", "uzb_cyrl", "vie", "yid"] },
                },
                {
                    id: "io-confidence",
                    name: "Confidence threshold",
                    description: "OCR confidence threshold below which text will not be imported (1-100)",
                    action: { type: "input", placeholder: "1-100" },
                },
            ]
        };
        extensionAPI.settings.panel.create(config);

        window.roamAlphaAPI.ui.blockContextMenu.addCommand({
            label: "Get Text from Images (OCR) in selected block(s)",
            callback: (e) => getText(e, false, false),
        });
        window.roamAlphaAPI.ui.blockContextMenu.addCommand({
            label: "Get Text from Images (OCR) in child blocks",
            callback: (e) => getText(e, false, true)
        });
        window.roamAlphaAPI.ui.msContextMenu.addCommand({
            label: "Get Text from Images (OCR) in selected block(s)",
            callback: (e) => getText(e, true, false),
        });

        async function getText(e, multi, child) {
            var lang, conf;
            breakme: {
                if (extensionAPI.settings.get("io-language") != null && extensionAPI.settings.get("io-language") != "eng") {
                    lang = extensionAPI.settings.get("io-language");
                } else {
                    lang = "eng";
                }
                if (extensionAPI.settings.get("io-confidence") != null && extensionAPI.settings.get("io-confidence") != "") {
                    var num = extensionAPI.settings.get("io-confidence");
                    if (isStringInteger(num) && isValidConf(num)) {
                        conf = Number(num);
                    } else {
                        key = "int";
                        sendConfigAlert(key);
                        break breakme;
                    }
                }
                const worker = await createWorker(lang); // create tesseract worker

                if (multi) { // multi-select mode
                    if (e.hasOwnProperty("blocks") && e.blocks.length > 0) {
                        for (var i = 0; i < e.blocks.length; i++) {
                            var results = await window.roamAlphaAPI.data.pull("[:block/string]", [":block/uid", e.blocks[i]["block-uid"]]);
                            await checkBlockString(results[":block/string"], e.blocks[i]["block-uid"]);
                        }
                    }
                } else if (child) { // block context menu - block children
                    let blockUid = e["block-uid"].toString();
                    let tree = window.roamAlphaAPI.pull(`[ :block/string :block/uid {:block/parents [:children/view-type]} {:block/children ...} ]`, [`:block/uid`, blockUid]);
                    await iterateTree(tree);

                    async function iterateTree(tree) {
                        if (tree.hasOwnProperty([":block/children"])) {
                            for (var i = 0; i < tree[":block/children"].length; i++) {
                                await checkBlockString(tree[":block/children"][i][":block/string"], tree[":block/children"][i][":block/uid"]);
                                if (tree[":block/children"][i].hasOwnProperty([":block/children"])) {
                                    await iterateTree(tree[":block/children"][i])
                                }
                            }
                        }
                    }
                } else { // block context menu
                    let uids = await roamAlphaAPI.ui.individualMultiselect.getSelectedUids()
                    if (uids.length < 2) { // one block selected
                        let blockString = e["block-string"].toString();
                        let blockUid = e["block-uid"].toString();
                        await checkBlockString(blockString, blockUid);
                    } else { // more than one block selected
                        multi = true;
                        for (var i = 0; i < uids.length; i++) {
                            var results = await window.roamAlphaAPI.data.pull("[:block/string]", [":block/uid", uids[i]]);
                            await checkBlockString(results[":block/string"], uids[i]);
                        }
                    }
                }

                await worker.terminate(); // terminate tesseract worker

                async function checkBlockString(blockString, blockUid) { // check if block contains an image and get text from matches
                    const regex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
                    let match, imageUrl;

                    while ((match = regex.exec(blockString)) !== null) {
                        imageUrl = match[2];
                    }
                    if (imageUrl != null) {
                        const ret = await worker.recognize(imageUrl);
                        if (ret.hasOwnProperty("data") && ret.data.hasOwnProperty("text")) {
                            if (conf != undefined && ret.data.confidence < conf) {
                                if (!multi && !child) {
                                    prompt("Failed to identify text from this block with enough confidence");
                                }
                            } else {
                                await window.roamAlphaAPI.createBlock(
                                    { "location": { "parent-uid": blockUid, "order": 0 }, "block": { "string": ret.data.text.toString() } });
                            }
                        } else if (!multi && !child) {
                            prompt("Failed to identify text from the image in this block");
                        }
                    } else if (!multi && !child) {
                        prompt("There were no images found in this block");
                    }
                }
            }
        }
    },
    onunload: () => {
        window.roamAlphaAPI.ui.blockContextMenu.removeCommand({
            label: "Get Text from Images (OCR) in selected block(s)",
        });
        window.roamAlphaAPI.ui.blockContextMenu.removeCommand({
            label: "Get Text from Images (OCR) in child blocks",
        });
        window.roamAlphaAPI.ui.msContextMenu.removeCommand({
            label: "Get Text from Images (OCR) in selected block(s)",
        });
    }
}

// helper functions
function prompt(string) {
    iziToast.show({
        theme: 'dark',
        message: string,
        class: 'iocr',
        position: 'center',
        close: false,
        timeout: 5000,
        closeOnClick: true,
        displayMode: 2
    });
}

function isStringInteger(value) {
    const number = Number(value);
    return !isNaN(number) && Number.isInteger(number);
}

function isValidConf(value) {
    const number = Number(value);
    return Number.isInteger(number) && !isNaN(number) && number >= 1 && number <= 100;
}

function sendConfigAlert(key) {
    if (key == "int") {
        prompt("Please enter only integers in the Confidence threshold field in Roam Depot settings");
    }
}