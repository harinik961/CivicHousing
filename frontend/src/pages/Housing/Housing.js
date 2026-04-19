import ModelPage from "../../components/ModelPage";
import { MODEL_ATTRIBUTES } from "../../config/modelAttributes";
export default function Housing() {


 const sortOptions = [
   { value: "total_affordable_units|desc", label: "Affordable Units: High to Low" },
   { value: "walk_score|asc", label: "Walkability: Low to High" },
   { value: "walk_score|desc", label: "Walkability: High to Low" },
   { value: "income_restriction_level|asc", label: "Income: Low to High" },
   { value: "income_restriction_level|desc", label: "Income: High to Low" },
   { value: "total_affordable_units|asc", label: "Affordable Units: Low to High" },
   { value: "total_affordable_units|desc", label: "Affordable Units: High to Low" }
 ];
 const filterOptions = [
   {
     parameter: "district",
     label: "Council district",
     buckets: [
       { label: "All", value: null },
       { label: "District 1 — Northeast / East", value: "1" },
       { label: "District 2 — Southeast", value: "2" },
       { label: "District 3 — East / Central-East", value: "3" },
       { label: "District 4 — North Central", value: "4" },
       { label: "District 5 — South / South Central", value: "5" },
       { label: "District 6 — Far Northwest", value: "6" },
       { label: "District 7 — North / Northwest Central", value: "7" },
       { label: "District 8 — Southwest", value: "8" },
       { label: "District 9 — Central / Downtown", value: "9" },
       { label: "District 10 — West", value: "10" },
     ],
   },
   {
     parameter: "unit_type",
     label: "Unit Type",
     buckets: [
       { label: "All", value: null },
       { label: "Single Family", value: "Single Family" },
       { label: "Multifamily", value: "Multifamily" }
     ]
   },
   {
     parameter: "housing_tenure",
     label: "Housing Tenure",
     buckets: [
       { label: "All", value: null },
       { label: "Ownership", value: "Ownership" },
       { label: "Rental", value: "Rental" }
     ]
   }
 ];
 return (
   <ModelPage
 title="Housing"
 apiEndpoint="/api/housing"
 modelName="housing"
 attributes={MODEL_ATTRIBUTES.housing}
 sortOptions={sortOptions}
 filterOptions={filterOptions}
 defaultSort="total_affordable_units|desc"


/>
 );
}