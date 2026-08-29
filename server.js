// ======================================================
// LANGDEX - DEEPSEEK BACKEND
// ======================================================

const express = require("express");

const app = express();

const PORT = 3000;


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json());


// ======================================================
// DEEPSEEK API KEY
// ======================================================

// ضع مفتاح DeepSeek هنا
const DEEPSEEK_API_KEY =
    "sk-9183061195f144948f5f9eb00c84213c";


// ======================================================
// DEEPSEEK API
// ======================================================

const DEEPSEEK_URL =
    "https://api.deepseek.com/chat/completions";


// ======================================================
// SEARCH WORD
// ======================================================

app.post("/api/search", async (req, res) => {

    try {

        const word =
            String(
                req.body.word || ""
            ).trim();


        // --------------------------------------------------
        // CHECK WORD
        // --------------------------------------------------

        if (!word) {

            return res.status(400).json({

                success: false,

                message:
                    "لم يتم إرسال كلمة."

            });

        }


        // --------------------------------------------------
        // PROMPT
        // --------------------------------------------------

        const prompt = `

أنت قاموس لغات احترافي لمشروع اسمه Langdex.

حلل الكلمة التالية:

"${word}"

مهم جدًا:

المشروع يدعم ثلاث لغات فقط:

1. English
2. Urdu
3. Hindi

يجب أن تحدد اللغة من هذه الثلاثة فقط.

لا تستخدم:
Arabic
French
German
Spanish
أو أي لغة أخرى.

إذا كانت الكلمة غير واضحة، اختر أقرب لغة من:
English
Urdu
Hindi

أريد النتيجة JSON فقط.

استخدم الشكل التالي بالضبط:

{
  "word": "${word}",
  "language": "English",
  "meaningArabic": [
    "المعنى الأول بالعربية",
    "المعنى الثاني بالعربية",
    "المعنى الثالث بالعربية"
  ],
  "synonyms": [
    "synonym 1",
    "synonym 2",
    "synonym 3"
  ]
}

القواعد:

- language يجب أن تكون واحدة فقط من:
  English
  Urdu
  Hindi

- meaningArabic يجب أن يكون باللغة العربية.
- أعطني من 3 إلى 6 معاني عربية مناسبة للكلمة.
- إذا كان للكلمة معنى واحد شائع، يمكن تكراره بصياغات عربية مختلفة مناسبة.
- synonyms يجب أن تكون بنفس لغة الكلمة.
- أعطني من 3 إلى 8 مرادفات.
- لا تكرر المرادفات.
- لا تكرر المعاني.
- لا تكتب شرحًا خارج JSON.
- لا تستخدم Markdown.
- لا تستخدم code blocks.
- أرجع JSON فقط.

`;

        
        // --------------------------------------------------
        // DEEPSEEK REQUEST
        // --------------------------------------------------

        const response =
            await fetch(
                DEEPSEEK_URL,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " +
                            DEEPSEEK_API_KEY

                    },

                    body:
                        JSON.stringify({

                            model:
                                "deepseek-chat",

                            messages: [

                                {
                                    role:
                                        "system",

                                    content:
                                        "You are a professional multilingual dictionary. Return valid JSON only."
                                },

                                {
                                    role:
                                        "user",

                                    content:
                                        prompt
                                }

                            ],

                            temperature:
                                0.2,

                            response_format:
                            {
                                type:
                                    "json_object"
                            },

                            stream:
                                false

                        })

                }
            );


        // --------------------------------------------------
        // READ RESPONSE
        // --------------------------------------------------

        const responseText =
            await response.text();


        console.log(
            "DeepSeek Status:",
            response.status
        );


        console.log(
            "DeepSeek Response:",
            responseText
        );


        // --------------------------------------------------
        // API ERROR
        // --------------------------------------------------

        if (!response.ok) {

            let message =
                "فشل الاتصال بـ DeepSeek.";

            try {

                const errorData =
                    JSON.parse(
                        responseText
                    );


                if (
                    errorData.error &&
                    errorData.error.message
                ) {

                    message =
                        errorData.error.message;

                }

            } catch (error) {

                if (responseText) {

                    message =
                        responseText;

                }

            }


            return res.status(
                response.status
            ).json({

                success: false,

                message:
                    "DeepSeek (" +
                    response.status +
                    "): " +
                    message

            });

        }


        // --------------------------------------------------
        // PARSE DEEPSEEK RESPONSE
        // --------------------------------------------------

        let result;


        try {

            result =
                JSON.parse(
                    responseText
                );

        } catch (error) {

            throw new Error(
                "استجابة DeepSeek غير صالحة."
            );

        }


        // --------------------------------------------------
        // CHECK CHOICES
        // --------------------------------------------------

        if (
            !result.choices ||
            result.choices.length === 0
        ) {

            throw new Error(
                "DeepSeek لم يرجع أي نتيجة."
            );

        }


        // --------------------------------------------------
        // GET CONTENT
        // --------------------------------------------------

        let content =
            result
                .choices[0]
                .message
                .content;


        if (!content) {

            throw new Error(
                "DeepSeek أرسل نتيجة فارغة."
            );

        }


        content =
            String(
                content
            ).trim();


        // --------------------------------------------------
        // REMOVE MARKDOWN
        // --------------------------------------------------

        content =
            content.replace(
                /^```json\s*/i,
                ""
            );


        content =
            content.replace(
                /^```\s*/i,
                ""
            );


        content =
            content.replace(
                /\s*```$/i,
                ""
            );


        content =
            content.trim();


        // --------------------------------------------------
        // PARSE GENERATED JSON
        // --------------------------------------------------

        let data;


        try {

            data =
                JSON.parse(
                    content
                );

        } catch (error) {

            const firstBrace =
                content.indexOf("{");

            const lastBrace =
                content.lastIndexOf("}");


            if (
                firstBrace === -1 ||
                lastBrace === -1
            ) {

                throw new Error(
                    "DeepSeek لم يرجع JSON صالح."
                );

            }


            const jsonText =
                content.substring(
                    firstBrace,
                    lastBrace + 1
                );


            try {

                data =
                    JSON.parse(
                        jsonText
                    );

            } catch (jsonError) {

                throw new Error(
                    "تعذر قراءة بيانات الكلمة من DeepSeek."
                );

            }

        }


        // ==================================================
        // NORMALIZE WORD
        // ==================================================

        data.word =
            data.word ||
            word;


        // ==================================================
        // NORMALIZE LANGUAGE
        // ==================================================

        let language =
            String(
                data.language || ""
            ).trim();


        const lowerLanguage =
            language.toLowerCase();


        if (
            lowerLanguage.includes(
                "english"
            )
        ) {

            language =
                "English";

        } else if (
            lowerLanguage.includes(
                "urdu"
            )
        ) {

            language =
                "Urdu";

        } else if (
            lowerLanguage.includes(
                "hindi"
            )
        ) {

            language =
                "Hindi";

        } else {

            // لو رجع قيمة غريبة
            language =
                "English";

        }


        data.language =
            language;


        // ==================================================
        // NORMALIZE MEANINGS
        // ==================================================

        if (
            !Array.isArray(
                data.meaningArabic
            )
        ) {

            if (
                data.meaningArabic
            ) {

                data.meaningArabic =
                    [
                        String(
                            data.meaningArabic
                        )
                    ];

            } else {

                data.meaningArabic =
                    [];

            }

        }


        // ==================================================
        // NORMALIZE SYNONYMS
        // ==================================================

        if (
            !Array.isArray(
                data.synonyms
            )
        ) {

            if (
                data.synonyms
            ) {

                data.synonyms =
                    [
                        String(
                            data.synonyms
                        )
                    ];

            } else {

                data.synonyms =
                    [];

            }

        }


        // ==================================================
        // CLEAN MEANINGS
        // ======================================================

        data.meaningArabic =
            [
                ...new Set(

                    data.meaningArabic

                        .map(
                            item =>
                                String(
                                    item
                                ).trim()
                        )

                        .filter(
                            item =>
                                item.length > 0
                        )

                )
            ];


        // ==================================================
        // CLEAN SYNONYMS
        // ======================================================

        data.synonyms =
            [
                ...new Set(

                    data.synonyms

                        .map(
                            item =>
                                String(
                                    item
                                ).trim()
                        )

                        .filter(
                            item =>
                                item.length > 0
                        )

                )
            ];


        // ==================================================
        // FINAL RESPONSE
        // ==================================================

        return res.json({

            success:
                true,

            data:
                {

                    word:
                        data.word,

                    language:
                        data.language,

                    meaningArabic:
                        data.meaningArabic,

                    synonyms:
                        data.synonyms

                }

        });


    } catch (error) {

        console.error(
            "SERVER ERROR:",
            error
        );


        return res.status(500).json({

            success:
                false,

            message:
                error.message ||
                "حدث خطأ غير معروف."

        });

    }

});


// ======================================================
// TEST ROUTE
// ======================================================

app.get("/", (req, res) => {

    res.json({

        success:
            true,

        message:
            "Langdex DeepSeek server is working."

    });

});


// ======================================================
// START SERVER
// ======================================================

app.listen(
    PORT,
    () => {

        console.log(
            "======================================"
        );

        console.log(
            "Langdex DeepSeek Server"
        );

        console.log(
            "Running on:"
        );

        console.log(
            `http://localhost:${PORT}`
        );

        console.log(
            "======================================"
        );

    }
);