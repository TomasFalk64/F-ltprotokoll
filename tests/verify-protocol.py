"""Check the standalone definition and the directly importable response example.

Requires jsonschema[format-nongpl], installed normally or in artifacts/schema-deps.
"""
import base64
import copy
import json
import sys
from decimal import Decimal
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'tests/artifacts/schema-deps'))
from jsonschema import Draft202012Validator, FormatChecker, ValidationError


def unique_pairs(pairs):
    result = {}
    for key, value in pairs:
        assert key not in result, f'Duplicate JSON key: {key}'
        result[key] = value
    return result


def read(name):
    return json.loads((root / 'docs/protocol' / name).read_text(encoding='utf-8'), object_pairs_hook=unique_pairs)


protocol = read('protocol.json')
schema = read('protocol.schema.json')
response = read('response.example.json')
checker = FormatChecker()
assert 'date-time' in checker.checkers
Draft202012Validator.check_schema(schema)
definition_validator = Draft202012Validator(schema, format_checker=checker)
definition_validator.validate(protocol)
answer_schema = protocol['response_format']['schema']
Draft202012Validator.check_schema(answer_schema)
answer_validator = Draft202012Validator(answer_schema, format_checker=checker)
answer_validator.validate(response)

fields = {field['id']: field for field in protocol['fields']}
assert len(fields) == len(protocol['fields'])
record_validators = {}
for key, record_type in protocol['record_types'].items():
    Draft202012Validator.check_schema(record_type['schema'])
    record_validators[key] = Draft202012Validator(record_type['schema'], format_checker=checker)

seen = set()
for name, value in response['fields']:
    field = fields[name]
    if field['type'] != 'multienum':
        assert name not in seen, f'Duplicate scalar field: {name}'
    seen.add(name)
    if not value:
        continue
    if field['type'] == 'records':
        records = json.loads(value, object_pairs_hook=unique_pairs)
        record_validators[field['record_type']].validate(records)
    elif field['type'] in ['integer', 'decimal']:
        number = Decimal(value)
        assert number.is_finite() and number >= field['minimum']
        assert number % Decimal(str(field['step'])) == 0
    elif field['type'] == 'date':
        checker.check(value, 'date')

for key, value in response['images'].items():
    assert fields[key]['storage'] == 'images'
    header, encoded = value.split(',', 1)
    data = base64.b64decode(encoded, validate=True)
    assert header == 'data:image/png;base64' and data.startswith(b'\x89PNG\r\n\x1a\n')

# Check that the schemas actually reject representative mistakes.
def rejects(validator, value):
    try:
        validator.validate(value)
    except ValidationError:
        return
    raise AssertionError('Invalid fixture was accepted')

bad = copy.deepcopy(protocol)
bad['fields'][0]['required'] = 'yes'
rejects(definition_validator, bad)
bad = copy.deepcopy(protocol)
bad['fields'][0]['type'] = 'texxt'
rejects(definition_validator, bad)
bad = copy.deepcopy(response)
bad['fields'].append(['svamptillgang', 'God'])
rejects(answer_validator, bad)
bad = copy.deepcopy(response)
bad['fields'].append(['namn', 123])
rejects(answer_validator, bad)
bad = copy.deepcopy(response)
bad['fields'].append(['unknown_field', 'test'])
rejects(answer_validator, bad)
wood = json.loads(next(value for name, value in response['fields'] if name == 'ved_liggande'))
bad = copy.deepcopy(wood)
bad[0]['tradslag'] = 'Björk'
bad[0]['karaktar'] = ['Barkborrepräglad']
rejects(record_validators['deadwood'], bad)
bad = copy.deepcopy(wood)
del bad[0]['annat']
rejects(record_validators['deadwood'], bad)
print('PASS: definition schema, embedded response/wood schemas, import example, numeric constraints, image and invalid fixtures.')
