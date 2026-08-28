=====================================================
// FIREBASE IMPORTS
// ======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ======================================================
// FIREBASE CONFIGURATION
// ======================================================

const firebaseConfig = {
  apiKey: "AIzaSyCKshc43O6DYwfPheHH9CsraX3VpU2fjc",
  authDomain: "langdex.firebaseapp.com",
  projectId: "langdex",
  storageBucket: "langdex.firebasestorage.app",
  messagingSenderId: "819838317933",
  appId: "1:819838317933:web:cae7f4531ea32f958c5664",
  measurementId: "G-F60CC2CDC"
};


// ======================================================
// INITIALIZE FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);

const db = getFirestore(app);


// ======================================================
// FORM ELEMENTS
// ======================================================

const form =
  document.querySelector(".form");

let idInput = null;
let wordInput = null;
let meaningInput = null;
let synonymsInput = null;
let languageSelect = null;


// ======================================================
// BUTTONS
// ======================================================

let registerButton = null;
let updateButton = null;
let deleteButton = null;
let clearButton = null;


// ======================================================
// GET FORM ELEMENTS
// ======================================================

if (form) {

  const inputs =
    form.querySelectorAll("input");


  idInput =
    inputs[0];

  wordInput =
    inputs[1];

  meaningInput =
    inputs[2];

  synonymsInput =
    inputs[3];


  languageSelect =
    form.querySelector("select");


  registerButton =
    document.querySelector(".reg");

  updateButton =
    document.querySelector(".upa");

  deleteButton =
    document.querySelector(".del");

  clearButton =
    document.querySelector(".cel");

}


// ======================================================
// GENERATE BUTTON
// ======================================================

const generateButton =
  document.querySelector(".gen");


// ======================================================
// SEARCH
// ======================================================

const searchInput =
  document.querySelector(".search-section input");

const searchButton =
  document.querySelector(".search-btn");


// ======================================================
// SHOW ALL DATA
// ======================================================

const showDataButton =
  document.querySelector(".show-data");

const dataTable =
  document.querySelector("#data-table");


// ======================================================
// SELECTED DOCUMENT
// ======================================================

let selectedDocumentId =
  null;


// ======================================================
// EXISTING DATA STATE
// ======================================================

let isExistingData =
  false;


// ======================================================
// SEARCH RESULTS
// ======================================================

let searchResults = [];


// ======================================================
// SEARCH INDEX
// ======================================================

let searchIndex = 0;


// ======================================================
// LAST SEARCH
// ======================================================

let lastSearchText = "";


// ======================================================
// UPDATE GENERATE BUTTON
// ======================================================

function updateGenerateButton() {

  if (!generateButton) {
    return;
  }


  if (isExistingData) {

    generateButton.disabled =
      true;

    generateButton.style.opacity =
      "0.5";

    generateButton.style.cursor =
      "not-allowed";

    generateButton.title =
      "This data already exists. Update or delete it.";

  } else {

    generateButton.disabled =
      false;

    generateButton.style.opacity =
      "1";

    generateButton.style.cursor =
      "pointer";

    generateButton.title =
      "";

  }

}


// ======================================================
// GET NEXT ID
// ======================================================

async function setNextId() {

  if (!idInput) {
    return;
  }


  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "words"
        )
      );


    let lastId =
      0;


    snapshot.forEach(
      (firebaseDoc) => {

        const data =
          firebaseDoc.data();


        const currentId =
          Number(
            data.id
          );


        if (
          currentId > lastId
        ) {

          lastId =
            currentId;

        }

      }
    );


    idInput.value =
      lastId + 1;


  } catch (error) {

    console.error(error);


    alert(
      "Error getting next ID: " +
      error.message
    );

  }

}


// ======================================================
// CLEAR FORM
// ======================================================

async function clearForm() {

  if (!form) {
    return;
  }


  // ==============================================
  // CLEAR INPUTS
  // ==============================================

  wordInput.value =
    "";

  meaningInput.value =
    "";

  synonymsInput.value =
    "";


  // ==============================================
  // RESET LANGUAGE
  // ==============================================

  if (languageSelect) {

    languageSelect.selectedIndex =
      0;

  }


  // ==============================================
  // RESET SELECTED DOCUMENT
  // ==============================================

  selectedDocumentId =
    null;


  // ==============================================
  // DATA IS NEW AGAIN
  // ==============================================

  isExistingData =
    false;


  // ==============================================
  // RESET SEARCH
  // ==============================================

  searchResults = [];

  searchIndex = 0;

  lastSearchText = "";


  if (searchInput) {

    searchInput.value =
      "";

  }


  // ==============================================
  // UPDATE GENERATE STATE
  // ==============================================

  updateGenerateButton();


  // ==============================================
  // GET LAST ID + 1
  // ==============================================

  await setNextId();

}


// ======================================================
// INITIAL SETUP
// ======================================================

setNextId();

updateGenerateButton();


// ======================================================
// CLEAR BUTTON
// ======================================================

if (clearButton) {

  clearButton.addEventListener(
    "click",
    async () => {

      await clearForm();

    }
  );

}


// ======================================================
// REGISTER / GENERATE
// ======================================================

if (registerButton) {

  registerButton.addEventListener(
    "click",
    async () => {


      // ================================================
      // DON'T REGISTER EXISTING SEARCHED DATA
      // ================================================

      if (isExistingData) {

        alert(
          "This word already exists in the database.\n\nYou can UPDATE or DELETE it."
        );

        return;

      }


      const word =
        wordInput.value.trim();


      const meaning =
        meaningInput.value.trim();


      const synonyms =
        synonymsInput.value.trim();


      const language =
        languageSelect.value;


      // ================================================
      // REQUIRED FIELDS
      // ================================================

      if (
        !word ||
        !meaning
      ) {

        alert(
          "Please fill in WORD and MEANING."
        );

        return;

      }


      try {

        // ==============================================
        // GET ALL DATA
        // ==============================================

        const snapshot =
          await getDocs(
            collection(
              db,
              "words"
            )
          );


        // ==============================================
        // CHECK DUPLICATE WORD
        // ==============================================

        let existingWord =
          null;


        snapshot.forEach(
          (firebaseDoc) => {

            const data =
              firebaseDoc.data();


            const databaseWord =
              String(
                data.word ?? ""
              )
              .trim()
              .toLowerCase();


            if (
              databaseWord ===
              word.toLowerCase()
            ) {

              existingWord =
                data;

            }

          }
        );


        // ==============================================
        // DUPLICATE
        // ==============================================

        if (existingWord) {

          alert(
            `This word already exists with ID ${existingWord.id}.`
          );

          return;

        }


        // ==============================================
        // GET LAST ID
        // ==============================================

        let lastId =
          0;


        snapshot.forEach(
          (firebaseDoc) => {

            const data =
              firebaseDoc.data();


            const currentId =
              Number(
                data.id
              );


            if (
              currentId > lastId
            ) {

              lastId =
                currentId;

            }

          }
        );


        const newId =
          lastId + 1;


        // ==============================================
        // ADD DATA
        // ==============================================

        await addDoc(
          collection(
            db,
            "words"
          ),
          {

            id:
              newId,

            word:
              word,

            meaning:
              meaning,

            synonyms:
              synonyms,

            language:
              language

          }
        );


        // ==============================================
        // SUCCESS
        // ==============================================

        alert(
          "Data registered successfully!"
        );


        // ==============================================
        // PREPARE NEXT ID
        // ==============================================

        idInput.value =
          newId + 1;


        wordInput.value =
          "";

        meaningInput.value =
          "";

        synonymsInput.value =
          "";


        languageSelect.selectedIndex =
          0;


        selectedDocumentId =
          null;


        isExistingData =
          false;


        updateGenerateButton();


      } catch (error) {

        console.error(error);


        alert(
          "Error saving data: " +
          error.message
        );

      }

    }
  );

}


// ======================================================
// SEARCH
// ======================================================

if (
  searchInput &&
  searchButton
) {


  // Focus search

  searchInput.focus();


  searchButton.addEventListener(
    "click",
    async () => {


      const searchText =
        searchInput.value
          .trim()
          .toLowerCase();


      // ================================================
      // EMPTY SEARCH
      // ================================================

      if (!searchText) {

        alert(
          "Please enter something to search."
        );

        return;

      }


      try {

        // ==============================================
        // NEW SEARCH
        // ==============================================

        if (
          searchText !==
          lastSearchText
        ) {


          const snapshot =
            await getDocs(
              collection(
                db,
                "words"
              )
            );


          searchResults = [];


          // ============================================
          // FIND ALL MATCHES
          // ============================================

          snapshot.forEach(
            (firebaseDoc) => {

              const data =
                firebaseDoc.data();


              const id =
                String(
                  data.id ?? ""
                ).toLowerCase();


              const word =
                String(
                  data.word ?? ""
                ).toLowerCase();


              const meaning =
                String(
                  data.meaning ?? ""
                ).toLowerCase();


              const synonyms =
                String(
                  data.synonyms ?? ""
                ).toLowerCase();


              const language =
                String(
                  data.language ?? ""
                ).toLowerCase();


              if (

                id.includes(
                  searchText
                ) ||

                word.includes(
                  searchText
                ) ||

                meaning.includes(
                  searchText
                ) ||

                synonyms.includes(
                  searchText
                ) ||

                language.includes(
                  searchText
                )

              ) {

                searchResults.push({

                  data:
                    data,

                  documentId:
                    firebaseDoc.id

                });

              }

            }
          );


          // Start from first result

          searchIndex =
            0;


          lastSearchText =
            searchText;

        }


        // ==============================================
        // NO RESULTS
        // ==============================================

        if (
          searchResults.length ===
          0
        ) {

          alert(
            "No results found."
          );

          return;

        }


        // ==============================================
        // GET CURRENT RESULT
        // ==============================================

        const result =
          searchResults[
            searchIndex
          ];


        const foundData =
          result.data;


        const foundDocumentId =
          result.documentId;


        // ==============================================
        // SAVE DOCUMENT ID
        // ==============================================

        selectedDocumentId =
          foundDocumentId;


        // ==============================================
        // EXISTING DATA
        // ==============================================

        isExistingData =
          true;


        updateGenerateButton();


        // ==============================================
        // FILL FORM
        // ==============================================

        idInput.value =
          foundData.id ?? "";


        wordInput.value =
          foundData.word ?? "";


        meaningInput.value =
          foundData.meaning ?? "";


        synonymsInput.value =
          foundData.synonyms ?? "";


        languageSelect.value =
          foundData.language ?? "";


        // ==============================================
        // NEXT RESULT
        // ==============================================

        searchIndex++;


        if (
          searchIndex >=
          searchResults.length
        ) {

          searchIndex =
            0;

        }


      } catch (error) {

        console.error(error);


        alert(
          "Error searching database: " +
          error.message
        );

      }

    }
  );

}


// ======================================================
// UPDATE
// ======================================================

if (updateButton) {

  updateButton.addEventListener(
    "click",
    async () => {


      if (!selectedDocumentId) {

        alert(
          "Please search for a word first."
        );

        return;

      }


      const word =
        wordInput.value.trim();


      const meaning =
        meaningInput.value.trim();


      const synonyms =
        synonymsInput.value.trim();


      const language =
        languageSelect.value;


      if (
        !word ||
        !meaning
      ) {

        alert(
          "Please fill in WORD and MEANING."
        );

        return;

      }


      try {

        const wordDocument =
          doc(
            db,
            "words",
            selectedDocumentId
          );


        await updateDoc(
          wordDocument,
          {

            word:
              word,

            meaning:
              meaning,

            synonyms:
              synonyms,

            language:
              language

          }
        );


        alert(
          "Data updated successfully!"
        );


        await clearForm();


      } catch (error) {

        console.error(error);


        alert(
          "Error updating data: " +
          error.message
        );

      }

    }
  );

}


// ======================================================
// DELETE
// ======================================================

if (deleteButton) {

  deleteButton.addEventListener(
    "click",
    async () => {


      if (!selectedDocumentId) {

        alert(
          "Please search for a word first."
        );

        return;

      }


      const confirmDelete =
        confirm(
          "Are you sure you want to delete this word?"
        );


      if (!confirmDelete) {

        return;

      }


      try {

        const wordDocument =
          doc(
            db,
            "words",
            selectedDocumentId
          );


        await deleteDoc(
          wordDocument
        );


        alert(
          "Data deleted successfully!"
        );


        await clearForm();


      } catch (error) {

        console.error(error);


        alert(
          "Error deleting data: " +
          error.message
        );

      }

    }
  );

}


// ======================================================
// SHOW ALL DATA
// ======================================================

if (
  showDataButton &&
  dataTable
) {

  showDataButton.addEventListener(
    "click",
    async () => {


      try {

        const snapshot =
          await getDocs(
            collection(
              db,
              "words"
            )
          );


        // Clear table

        dataTable.innerHTML =
          "";


        // ==============================================
        // EMPTY DATABASE
        // ==============================================

        if (
          snapshot.empty
        ) {

          alert(
            "There is no data in the database."
          );

          return;

        }


        const rows = [];


        // ==============================================
        // GET DATA
        // ==============================================

        snapshot.forEach(
          (firebaseDoc) => {

            const data =
              firebaseDoc.data();


            rows.push(
              data
            );

          }
        );


        // ==============================================
        // SORT BY ID
        // ==============================================

        rows.sort(
          (a, b) =>
            Number(a.id) -
            Number(b.id)
        );


        // ==============================================
        // CREATE ROWS
        // ==============================================

        rows.forEach(
          (data) => {


            const row =
              document.createElement(
                "tr"
              );


            const idCell =
              document.createElement(
                "td"
              );


            const wordCell =
              document.createElement(
                "td"
              );


            const meaningCell =
              document.createElement(
                "td"
              );


            const synonymsCell =
              document.createElement(
                "td"
              );


            const languageCell =
              document.createElement(
                "td"
              );


            // ==========================================
            // VALUES
            // ==========================================

            idCell.textContent =
              data.id ?? "-";


            wordCell.textContent =
              data.word ?? "-";


            meaningCell.textContent =
              data.meaning ?? "-";


            synonymsCell.textContent =
              data.synonyms ?? "-";


            languageCell.textContent =
              data.language ?? "-";


            // ==========================================
            // APPEND
            // ==========================================

            row.appendChild(
              idCell
            );


            row.appendChild(
              wordCell
            );


            row.appendChild(
              meaningCell
            );


            row.appendChild(
              synonymsCell
            );


            row.appendChild(
              languageCell
            );


            dataTable.appendChild(
              row
            );

          }
        );


      } catch (error) {

        console.error(error);


        alert(
          "Error loading data: " +
          error.message
        );

      }

    }
  );

}