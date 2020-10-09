(function (entityLogicalName, fields, optionSets, orgUrl) {
    function sortObject(o) {
        var sorted = {},
            key, a = [];

        for (key in o) {
            if (o.hasOwnProperty(key)) {
                a.push(key);
            }
        }

        a.sort();

        for (key = 0; key < a.length; key++) {
            sorted[a[key]] = o[a[key]];
        }
        return sorted;
    };

    function toSource(o) {
        var str = `${o.EntityLogicalName}: {\n`;
        str += `    EntityLogicalName: "${o.EntityLogicalName}",\n`;
        str += `    ODataEntitySet: "${o.ODataEntitySet}",\n`;
        str += "    Fields: {\n";
        for (var field in o.Fields) {
            str += `        ${field}: "${o.Fields[field]}",\n`;
        }
        str += "    },\n"
        str += "    ODataFields: {\n";
        for (var field in o.OdataFields) {
            str += `        ${field}: "${o.OdataFields[field]}",\n`;
        }
        str += "    }\n";
        str += "}";

        return str;
    };

    function toOptionSetSource(o) {
        var str = `${o.EntityLogicalName}: {\n`;
        for (var optionSet in o.OptionSets) {
            str += "    /** @enum {number} */\n";
            str += `    ${optionSet}: {\n`;
            var i = 0;
            for (var optionValue in o.OptionSets[optionSet]) {
                i++;
                str += `        ${optionValue}: ${o.OptionSets[optionSet][optionValue]}${i < Object.keys(o.OptionSets[optionSet]).length ? ',' : ''}\n`;
            }
            str += "    },\n";
            str += "\n";
        }
        str += "}";

        return str;
    };

    function generate() {
        var output = "";

        if (fields) {
            output += generateEntity() + "\n\n";
        }

        if (optionSets) {
            output += generateOptionSets();
        }

        console.log(output);
    }

    function generateEntity() {
        try {
            var entity2 = {};

            var xhr = new XMLHttpRequest();
            xhr.open(
                "GET",
                [orgUrl, "/api/data/v8.2/EntityDefinitions(LogicalName='", entityLogicalName, "')?$select=SchemaName,LogicalCollectionName,LogicalName"].join(""),
                false
            );

            xhr.setRequestHeader("OData-MaxVersion", "4.0");
            xhr.setRequestHeader("OData-Version", "4.0");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");

            xhr.send(null);

            if (xhr.status === 200) {
                var entity = JSON.parse(xhr.responseText);

                entity2 = {
                    EntityLogicalName: entityLogicalName,
                    SchemaName: entity.SchemaName,
                    ODataEntitySet: entity.LogicalCollectionName,
                    Fields: {},
                    OdataFields: {}
                };
            }
            else {
                document.getElementById("output").innerText = `${xhr.status}: ${xhr.responseText}`;
                console.error(`${xhr.status}: ${xhr.statusText} - ${xhr.responseText}`);
            }

            xhr.open(
                "GET",
                [orgUrl, "/api/data/v8.2/EntityDefinitions(LogicalName='", entityLogicalName, "')/Attributes?$select=LogicalName,SchemaName"].join(""),
                false
            );

            xhr.setRequestHeader("OData-MaxVersion", "4.0");
            xhr.setRequestHeader("OData-Version", "4.0");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");

            xhr.send(null);

            if (xhr.status === 200) {
                var entity = JSON.parse(xhr.responseText).value;

                for (var field in entity) {
                    if (entity[field].LogicalName.indexOf("_base") < 0) {
                        var field2 = entity[field].LogicalName;

                        if (entity[field]["@odata.type"] === "#Microsoft.Dynamics.CRM.LookupAttributeMetadata") {
                            field2 = `_${field2}_value`;
                        }

                        entity2.Fields[entity[field].LogicalName] = entity[field].LogicalName;
                        entity2.OdataFields[entity[field].LogicalName] = field2;
                    }
                }
                entity2.Fields = sortObject(entity2.Fields);
                entity2.OdataFields = sortObject(entity2.OdataFields);
                console.log(entity2);
                return toSource(entity2);
            } else {
                console.error(`${xhr.status}: ${xhr.statusText} - ${xhr.responseText}`);
                return `${xhr.status}: ${xhr.responseText}`;
            }
        }
        catch (exception) {
            console.error(JSON.stringify(exception));
            return JSON.stringify(exception);
        }
    };

    function generateOptionSets() {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open(
                "GET",
                [orgUrl, "/api/data/v8.2/EntityDefinitions(LogicalName='", entityLogicalName, "')/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet,GlobalOptionSet"].join(""),
                false
            );

            xhr.setRequestHeader("OData-MaxVersion", "4.0");
            xhr.setRequestHeader("OData-Version", "4.0");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");

            xhr.send(null);

            if (xhr.status === 200) {
                var entity = JSON.parse(xhr.responseText).value;

                var entity2 = {
                    EntityLogicalName: entityLogicalName,
                    OptionSets: {}
                };

                for (var i = 0; i < entity.length; i++) {
                    var optionSet = {};

                    if (entity[i].OptionSet) {
                        for (var o = 0; o < entity[i].OptionSet.Options.length; o++) {
                            optionSet[entity[i].OptionSet.Options[o].Label.UserLocalizedLabel.Label.replace(/[^A-Za-z0-9]+/g, "")] = entity[i].OptionSet.Options[o].Value;
                        }
                    }

                    if (entity[i].GlobalOptionSet) {
                        for (var o = 0; o < entity[i].GlobalOptionSet.Options.length; o++) {
                            optionSet[entity[i].GlobalOptionSet.Options[o].Label.UserLocalizedLabel.Label.replace(/[^A-Za-z0-9]+/g, "")] = entity[i].GlobalOptionSet.Options[o].Value;
                        }
                    }

                    entity2.OptionSets[entity[i].LogicalName] = optionSet;
                }

                entity2.OptionSets = sortObject(entity2.OptionSets);
                console.log(entity2);
                return toOptionSetSource(entity2);
            }
            else {
                console.error(`${xhr.status}: ${xhr.statusText} - ${xhr.responseText}`);
                return `${xhr.status}: ${xhr.responseText}`;
            }
        }
        catch (exception) {
            console.error(JSON.stringify(exception));
            return JSON.stringify(exception);
        }
    };

    generate();
})('account', true, true);