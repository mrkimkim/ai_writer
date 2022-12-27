import Head from "next/head";
import {useEffect, useRef, useState} from "react";
import styles from "./index.module.css";

const ROUND_LIMIT = 10;

const PROMPT_STRING_LENGTH_LIMIT = {
    "한국어": 128,
    "English": 128,
}

const UI_STRING_BY_LANGUAGE = {
    "한국어": {
        appTitle: "유령 작가 스토리",
        sentenceInputHint: " /10번째 문장)",
        submitBtnText: "입력",
        languageToggleText: "English Mode",
        invalidSentenceAlertText: "문장에 오류가 있습니다. 유효한 문장을 입력해주세요. 유효한 문장의 길이는 4~128자 입니다.",
        humanSpeakerText: "당신",
        aiSpeakerText: "유령 작가",
        languageToggleConfirmationText: "사용 언어를 변경합니다. 현재 작성 중이 모든 내용이 초기화됩니다.",
        copyBtnText: "복사하기",
        howToGetAPIKey: "API 키를 얻는 방법",
        howToGetAPIKeyHint: "OpenAI API Key를 입력하세요",
        roundFinishText: "소설이 완성되었습니다. 스크롤을 올려 결과를 확인해보세요!",
    },
    "English": {
        appTitle: "Writing a novel with Ghost Writer",
        sentenceInputHint: " of 10 sentence)",
        submitBtnText: "Enter",
        languageToggleText: "한국어 모드",
        invalidSentenceAlertText: "This sentence is invalid. Please input a valid sentence (4~128 length).",
        humanSpeakerText: "You",
        aiSpeakerText: "Ghost Writer",
        languageToggleConfirmationText: "Switch to the different language. Note that your current sentences will be deleted.",
        copyBtnText: "Copy Text",
        howToGetAPIKey: "Get OpenAI API Key",
        howToGetAPIKeyHint: "Paste OpenAI API Key",
        roundFinishText: "Your novel is finished! Scroll up and check the result!",
    }
}

// List of sentences
let sentences = [];
// List of sentences with speaker label
let message_list = [];

function addNewSentence(message) {
    message.split('.').forEach(s => {
        if (s.length == 0) {
            return;
        }
        const last_chr = s.slice(-1);
        if (last_chr !== '!' && last_chr !== '?' && last_chr !== '.') {
            sentences.push(s + ".");
        } else {
            sentences.push(s);
        }
    });
}

function addNewMessage(speaker, message) {
    message_list.push({
        speaker: speaker,
        content: message,
    })
}

function generatePromptSentences() {
    const MAX_LENGTH = 300;
    // Count the number of characters
    let character_count = 0;
    sentences.forEach(s => character_count += s.length)

    for (let i = 0; i < sentences.length; ++i) {
        if (character_count <= MAX_LENGTH) {
            return sentences.slice(i).join(' ');
        }
        character_count -= sentences[i].length;
    }
}

function renderHumanMessage(language, message) {
    const speaker = UI_STRING_BY_LANGUAGE[language].humanSpeakerText;
    return <div className={styles.humanMessage} key={speaker | message}>{message}</div>
}

function renderAIMessage(language, message) {
    const speaker = UI_STRING_BY_LANGUAGE[language].aiSpeakerText;
    return <div className={styles.aiMessage} key={speaker | message}>{message}</div>
}

function renderConversation(language) {
    let result = message_list.map(
        message => {
            if (message.speaker == "Human") {
                return renderHumanMessage(language, message.content);
            } else {
                return renderAIMessage(language, message.content);
            }
        }
    )
    return result;
}

function getWholeStory() {
    return sentences.join(" ");
}

function refineResponseText(text) {
    text = text.replaceAll('\\n', "");
    text = text.replaceAll('\\', "");
    text = text.replaceAll('"', "");
    text = text.trim();
    const lastIndex = text.indexOf('.');
    return text.substring(0, lastIndex + 1);
}

function isInvalidInput(sentenceInput, limit) {
    return !(sentenceInput.length >= 4 && sentenceInput.length <= limit);
}

export default function Home() {
    const [sentenceInput, setSentenceInput] = useState("");
    const [result, setResult] = useState();
    const [submitEnabled, setSubmitEnabled] = useState(true);
    const [languageSetting, setLanguageSetting] = useState("English")
    const [appTitle, setAppTitle] = useState(UI_STRING_BY_LANGUAGE[languageSetting].appTitle)
    const [languageToggleText, setLanguageToggleText] = useState(UI_STRING_BY_LANGUAGE[languageSetting].languageToggleText)
    const [sentenceInputHint, setSentenceInputHint] = useState("(1" + UI_STRING_BY_LANGUAGE[languageSetting].sentenceInputHint)
    const [submitBtnText, setSubmitBtnText] = useState(UI_STRING_BY_LANGUAGE[languageSetting].submitBtnText)
    const [copyBtnText, setCopyBtnText] = useState(UI_STRING_BY_LANGUAGE[languageSetting].copyBtnText)
    const [wholeStory, setWholeStory] = useState("")
    const [debugString, setDebugString] = useState("")
    const [apiKey, setAPIKey] = useState("");
    const [howToGetAPIKey, setHowToGetAPIKey] = useState(UI_STRING_BY_LANGUAGE[languageSetting].howToGetAPIKey);
    const [howToGetAPIKeyHint, setHowToGetAPIKeyHint] = useState(UI_STRING_BY_LANGUAGE[languageSetting].howToGetAPIKeyHint);
    const [round, setRound] = useState(1);

    const pageEndRef = useRef();
    const scrollToBottom = () => {
        pageEndRef.current?.scrollIntoView({behavior: "smooth"})
    }

    useEffect(() => {
        scrollToBottom()
    }, [result]);

    useEffect(() => {
        setAppTitle(UI_STRING_BY_LANGUAGE[languageSetting].appTitle);
        setSentenceInputHint("(" + round + UI_STRING_BY_LANGUAGE[languageSetting].sentenceInputHint);
        setSubmitBtnText(UI_STRING_BY_LANGUAGE[languageSetting].submitBtnText);
        setLanguageToggleText(UI_STRING_BY_LANGUAGE[languageSetting].languageToggleText);
        setCopyBtnText(UI_STRING_BY_LANGUAGE[languageSetting].copyBtnText);
        setHowToGetAPIKey(UI_STRING_BY_LANGUAGE[languageSetting].howToGetAPIKey);
        setHowToGetAPIKeyHint(UI_STRING_BY_LANGUAGE[languageSetting].howToGetAPIKeyHint);
    })

    async function onClickCopy() {
        navigator.clipboard.writeText(wholeStory);
        alert("Copied");
    }

    async function onClickLanguage() {
        // Refresh
        if (sentences.length > 0) {
            if (!confirm(UI_STRING_BY_LANGUAGE[languageSetting].languageToggleConfirmationText)) {
                return;
            }
        }

        // Clean storage
        sentences = [];
        message_list = [];
        setWholeStory("");
        setDebugString("");
        setRound(1);

        if (languageSetting === "English") {
            setLanguageSetting("한국어");
        } else if (languageSetting === "한국어") {
            setLanguageSetting("English");
        }
    }

    async function onSubmit(event, retry = 0) {
        event.preventDefault();

        // Check if it's already done
        if (round > ROUND_LIMIT) {
            alert(UI_STRING_BY_LANGUAGE[languageSetting].roundFinishText);
            return;
        }

        try {
            if (isInvalidInput(sentenceInput, PROMPT_STRING_LENGTH_LIMIT[languageSetting])) {
                alert(UI_STRING_BY_LANGUAGE[languageSetting].invalidSentenceAlertText);
                return;
            }

            setSubmitEnabled(false);

            // Add new sentence and update display.
            if (retry == 0) {
                addNewSentence(sentenceInput);
                addNewMessage("Human", sentenceInput);
                setWholeStory(getWholeStory());
                setResult(renderConversation(languageSetting));
                setDebugString(generatePromptSentences());

                // Clean up sentence Input
                setSentenceInput("");
            } else if (retry >= 4) {
                alert("Sorry for the inconvenience. We got an unexpected error.");
                return;
            }

            const response = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({sentence: generatePromptSentences(), language: languageSetting, apiKey: apiKey}),
            });

            const data = await response.json();
            if (response.status !== 200) {
                throw data.error || new Error(`Request failed with status ${response.status}`);
            }

            const refinedResponse = refineResponseText(data.result.choices[0].text);
            setDebugString(JSON.stringify(data.result));
            if (refinedResponse.length == 0) {
                onSubmit(event, retry + 1);
                return;
            }

            // Handle response / Update display / Clean input
            addNewSentence(refinedResponse);
            addNewMessage("AI", refineResponseText(data.result.choices[0].text));
            setWholeStory(getWholeStory());
            setResult(renderConversation(languageSetting));

            if (round >= ROUND_LIMIT) {
                alert(UI_STRING_BY_LANGUAGE[languageSetting].roundFinishText);
                setSubmitEnabled(false);
            } else {
                setSubmitEnabled(true);
            }

            setRound(round + 1);

        } catch (error) {
            // Consider implementing your own error handling logic here
            console.error(error);
            alert(error.message);
        }
    }

    return (<div>
        <Head>
            <title>{appTitle}</title>
            <link rel="icon" href="/edit.png"/>
        </Head>
        <div className={styles.appreciation}>
            <a href="https://www.flaticon.com/free-icons/quill-pen" title="quill pen icons" target="_blank">Quill pen
                icons created by
                Dmytro Vyshnevskyi - Flaticon</a>
            <a href="https://www.flaticon.com/free-icons/language" title="language icons" target="_blank">Language icons
                created by
                Anthony
                Ledoux - Flaticon</a>
            <a href="https://www.flaticon.com/free-icons/paper" title="paper icons" target="_blank">Paper icons created
                by Gregor
                Cresnar - Flaticon</a>
        </div>
        <main className={styles.main}>
            <div className={styles.languageSelectorContainer}>
                <button className={styles.languageSelector} onClick={onClickLanguage}>
                    <span className={styles.languageSelectorIcon}><img src="internet.png"/></span>
                    <span>{languageToggleText}</span>
                </button>
            </div>
            <img src="/edit.png" className={styles.icon}/>
            <h3>{appTitle}</h3>
            <input className={styles.apiKeyInput} type="text" name="api_key" placeholder={howToGetAPIKeyHint}
                   onChange={(e) => setAPIKey(e.target.value)}/>
            <a href="https://beta.openai.com/account/api-keys" target="_blank">{howToGetAPIKey}</a>
            <div hidden={wholeStory.length == 0} className={styles.wholeStory}>{wholeStory}
                <button className={styles.copyBtn} onClick={onClickCopy}>
                    <span className={styles.copyBtnIcon}><img src="copy.png"/></span>
                    <span>{copyBtnText}</span>
                </button>
            </div>
            <div hidden={wholeStory.length == 0} className={styles.result}>{result}</div>
            <div hidden={true}>{debugString}</div>
            <form ref={pageEndRef} onSubmit={onSubmit}>
                <input
                    className={styles.sentenceInput}
                    type="text"
                    name="sentence"
                    placeholder={sentenceInputHint}
                    value={sentenceInput}
                    onChange={(e) => setSentenceInput(e.target.value)}
                />
                <input disabled={!submitEnabled} type="submit" value={submitBtnText}/>
            </form>
        </main>
    </div>);
}
