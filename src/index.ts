import express from 'express';
import bodyParser from 'body-parser';
import {FakeServer, RouteCallTester} from 'simple-fake-server'; // this is waiting for a pr in simple-fake-server
import uuidv4 from 'uuid/v4';

const FAKE_API_PORT = Number(process.env.FAKE_API_PORT) || 1234;
const ADMIN_PORT = process.env.ADMIN_PORT || 3000;

type Verb = 'get' | 'post' | 'delete' | 'put' | 'patch';
const mockedCalls = new Map<string, RouteCallTester>();

const fakeServer = new FakeServer(FAKE_API_PORT);
fakeServer.start();

const app = express();
app.use(bodyParser.json());

app.post('/fake_server_admin/calls', (req, res) => {
    const mockedMethod: Verb = req.body.method;
    const mockedUrl: string = req.body.url;
    const mockedResponse: any = req.body.response;
    const isJson: boolean = req.body.isJson;

    const callId = uuidv4();
    const call = fakeServer.http[mockedMethod]()
        .to(mockedUrl)
        .willReturn(isJson ? JSON.parse(mockedResponse) : mockedResponse).call;

    mockedCalls.set(callId, call);
    res.send({callId});
});

app.delete('/fake_server_admin/calls', (_req, res) => {
    fakeServer.callHistory.clear();
    res.send('Ok');
});

app.get('/fake_server_admin/calls', (req, res) => {
    const callId = req.query.callId;
    const mockedCall = mockedCalls.get(callId);

    if (!mockedCall) {
        res.send({hasBeenMade: false});
    } else {
        const madeCall = fakeServer.callHistory.calls.find(
            c => c.method === mockedCall.method && new RegExp(mockedCall.pathRegex).test(c.path)
        );

        if (!madeCall) {
            res.send({hasBeenMade: false});
        } else {
            res.send({hasBeenMade: true, details: madeCall});
        }
    }
});

app.listen(ADMIN_PORT, () => console.log(`simple fake server admin is on port $3000, mocked api is on port 1234`));
