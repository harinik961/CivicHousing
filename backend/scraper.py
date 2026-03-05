import requests
import zipfile
import io
import pandas as pd

def get_data():
    url = "https://data.texas.gov/download/r4v4-vz24/application/zip"

    response = requests.get(url)
    z = zipfile.ZipFile(io.BytesIO(response.content))

    with z.open("routes.txt") as f:
        df = pd.read_csv(f)

    filtered = df[["route_type"]]

    return filtered.to_dict(orient="records")