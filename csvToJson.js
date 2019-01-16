//Libs and Packages used in this project

var fs = require("fs");
var _ = require('lodash');
var validator = require('validator');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const PHONE_NUMBER_FORMAT = require('google-libphonenumber').PhoneNumberFormat;
var parse = require('csv-parse');

//Output Array and Header elements array
var headArray = [];
var outputArray = [];

function HeaderVariables(type, tags) {
    this.type = type;
    this.tags = tags;

}

function User(fullname, eid, classes, addresses, invisible, see_all) {
    this.fullname = fullname;
    this.eid = eid;
    this.classes = classes;
    this.addresses= addresses;
    this.invisible = invisible;
    this.see_all = see_all;
}

function Address(type, tags, address) {
    this.type = type;
    this.tags = tags;
    this.address = address;
}

fs.readFile('input.csv', function (err, data) {

    parse(data, function(err, csvLines) {

      // Separates first row as a header and separates each column as an element of an array
      var headerElem = _.chunk(_.head(csvLines), 1);

      //Separates the elements of the header into tags and types
      let tags = [];
      let type;
      let arrOfHeaderElem;

      for(i=0;i<headerElem.length;i++)
      {
        arrOfHeaderElem = headerElem[i].toString().replace(/,/g, '').split(" ");
        tags = _.drop(arrOfHeaderElem);
        type = _.head(arrOfHeaderElem);

        headArray.push(new HeaderVariables(type, tags.slice()));
      }

      csvUserData = _.drop(csvLines); //catches just the user data inside the .csv

      //Variables used:
      var addresses = [],
          classes = [],
          classElem = [],
          parsedEmails = [],
          invisible,
          see_all;

      //Loops into user data from the .csv file
      for(i=0;i<csvUserData.length;i++)
      {
        classes.splice(0, classes.length);
        addresses.splice(0, addresses.length);
        classElem.splice(0, classElem.length);
        parsedEmails.splice(0, parsedEmails.length);

        parsedUserData = _.chunk(csvUserData[i], 1);

        for (j = 0; j < csvUserData[i].length; j++)
        {

          //Based on Header array, it switches over the actions to be performed
          switch (headArray[j].type) {

            case 'fullname':
              name = parsedUserData[j].toString();
              break;

            case 'eid':
              id = parsedUserData[j].toString();
              break;

            case 'class':

              if(csvUserData != "")
              {
                classElem = _.chunk(parsedUserData[j].toString().replace('/', ',').split(","), 1);

                // Adds new value to an array, if not empty
                for(k=0; k < classElem.length; k++) {
                  if (classElem[k].toString() != "") {
                    classes.push(classElem[k].toString().trim());
                  }
               }
               break;
             }
             case 'email':
              // Replaces '/' with ',' to obtain a consistent pattern, and tokenizes string with commas as delimiters
                parsedEmails = _.chunk(parsedUserData[j].toString().replace('/', ',').split(","), 1);
                // Trims every element
                parsedEmails.map(function(parsed_email) { return parsed_email.toString().trim() });

                // Checks which email inputs are valid
                for(k=0; k < parsedEmails.length; k++) {
                    if (validator.isEmail(parsedEmails[k].toString()) ) {
                        // Searches for a previous email input with same address
                        // If it is found, just adds new tags, if not, adds new Address object to an array
                        var index = addresses.findIndex( function (addr) {
                            return addr.address == parsedEmails[k] && addr.type == 'email'
                        });

                        if (index != -1) {
                            addresses[index].tags.push.apply(addresses[index].tags, headArray[j].tags.slice());
                        }
                        else {
                            addresses.push(new Address(headArray[j].type, headArray[j].tags.slice(), parsedEmails[k].toString()));
                        }
                    }
                }
                break;

                case 'see_all':
                  see_all_input = parsedUserData[j].toString();

                  if (see_all_input == "" || see_all_input == "0" || see_all_input == "no") {
                      see_all = false;
                  }
                  else {
                      see_all = true;
                  }
                  break;

               case 'phone':

                let parsedNumber;
                // Initial trimming
                phoneNumber = parsedUserData[j].toString().trim();

                // Attempts to parse input as a phone number, if it fails (error thrown, just skips entry)
                try {
                    parsedNumber = phoneUtil.parse(phoneNumber, 'BR');
                }
                catch (phoneErr) {
                    break;
                }

                // If parsing is successfull and the parsed number is valid:
                if ( phoneUtil.isValidNumber(parsedNumber) ) {

                    // Searches for a previous phone number input with same number
                    // If it is found, just adds new tags, if not, adds new Address object to an array
                    var index = addresses.findIndex( function (addr) {
                        return addr.address == phoneNumber && addr.type == 'phone'
                    });
                    if (index != -1) {
                        addresses[index].tags.push.apply(addresses[index].tags, headArray[j].tags.slice());
                    }
                    else {
                        addresses.push(new Address(headArray[j].type, headArray[j].tags.slice(), phoneUtil.format(parsedNumber, PHONE_NUMBER_FORMAT.E164).replace("+", "")));
                    }

                }
                break;

             case 'invisible':

               invisible_input = parsedUserData[j].toString();

               if (invisible_input == "" || invisible_input == "0" || invisible_input == "no") {
                   invisible = false;
               }
               else {
                   invisible = true;
               }
               break;
             }
           }

        let userID;
        // Searches for previous user data/row input with same 'eid'
        userID = outputArray.findIndex( function (user) {
            return user.eid == id;
        });

        // Case it is found, update addresses, boolean variables and classes
        if (userID != -1) {
            // Extending arrays
            outputArray[userID].addresses.push.apply(outputArray[userID].addresses, addresses.slice());
            outputArray[userID].classes.push.apply(outputArray[userID].classes, classes.slice());

            // Boolean operations
            outputArray[userID].invisible = outputArray[userID].invisible || invisible;
            outputArray[userID].see_all = outputArray[userID].see_all ||see_all;
        }
        // If the eid isn't found, pushes new User object
        else {
            outputArray.push(new User(name, id, classes.slice(), addresses.slice(), invisible, see_all));
        }
      }

      // Generating JSON file
      var JSONFile = JSON.stringify(outputArray, null, 2);
      fs.writeFile('output.json', JSONFile, 'utf8', function(err){
          if(err) {
             console.log("An error occurred during JSON creation!");
          }
      });
    });
})
